import { useState, useEffect } from 'react';
import { ShieldCheck, Phone, CheckCircle, BellRing, Smartphone, Trash2, Cpu, HelpCircle, ArrowRight } from 'lucide-react';
import { DeviceDto } from '../types';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function DeviceConnect() {
  const [deviceLabel, setDeviceLabel] = useState('My Connected Phone');
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionJson, setSubscriptionJson] = useState<string>('');
  const [storedDeviceId, setStoredDeviceId] = useState<string>('');
  const [connectedDevices, setConnectedDevices] = useState<DeviceDto[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'err' | 'info'; text: string } | null>(null);

  useEffect(() => {
    // Sync current browser permissions
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
    fetchConnectedDevices();
    
    // Check local storage for previously saved tokens
    const savedId = localStorage.getItem('civicalert_device_id');
    const savedName = localStorage.getItem('civicalert_device_label');
    if (savedId) setStoredDeviceId(savedId);
    if (savedName) setDeviceLabel(savedName);
  }, []);

  const fetchConnectedDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setConnectedDevices(data);
      }
    } catch (e) {
      console.error('Failed to load registered active devises', e);
    }
  };

  const handleRegisterNotification = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatusMessage({
        type: 'err',
        text: 'Push notifications are not supported in this browser. Please open CivicAlert in a standard browser tab (not sandboxed iframe) or on a smartphone.'
      });
      return;
    }

    setIsSubscribing(true);
    setStatusMessage({ type: 'info', text: 'Connecting with CivicAlert server...' });

    try {
      // 1. Ask permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        throw new Error('Permission not granted for declarations');
      }

      // 2. Fetch public key
      const keyRes = await fetch('/api/vapid-public-key');
      if (!keyRes.ok) throw new Error('VAPID public key could not be resolved from server');
      const { publicKey } = await keyRes.json();

      // 3. Register/Ready Service Worker
      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker Registered successfully', reg);
      } catch (e) {
        console.warn('Direct registration failed, finding existing:', e);
        reg = await navigator.serviceWorker.ready;
      }

      // Wait for registration active state
      // Ensure SW is running
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // 4. Get or Create Push subscription
      let subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        // Unsubscribe from previous keys if any, and resubscribe to avoid stale key mismatch
        await subscription.unsubscribe();
      }

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      setSubscriptionJson(JSON.stringify(subscription, null, 2));

      // 5. Send subscription parameters to the backend
      const response = await fetch('/api/connect-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          label: deviceLabel
        })
      });

      if (!response.ok) {
        throw new Error('Server connection failed during token exchange');
      }

      const resData = await response.json();
      
      // Save details locally
      localStorage.setItem('civicalert_device_id', resData.deviceId);
      localStorage.setItem('civicalert_device_label', deviceLabel);
      setStoredDeviceId(resData.deviceId);

      setStatusMessage({
        type: 'success',
        text: `Device successfully synchronized! A test alert banner has been dispatched directly to "${deviceLabel}".`
      });

      fetchConnectedDevices();
    } catch (error: any) {
      console.error('Subscription error context:', error);
      setStatusMessage({
        type: 'err',
        text: `Sync Failed: ${error.message || 'Notification setup interrupted.'}`
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDisconnectDevice = async (id: string) => {
    try {
      const res = await fetch('/api/disconnect-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id })
      });
      if (res.ok) {
        if (id === storedDeviceId) {
          localStorage.removeItem('civicalert_device_id');
          setStoredDeviceId('');
          setSubscriptionJson('');
        }
        setStatusMessage({ type: 'success', text: 'Device successfully decoupled.' });
        fetchConnectedDevices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upper Intro Banner */}
      <div className="bg-[#ECF3E9] rounded-2xl p-6 md:p-8 border border-[#D1E1CB] flex flex-col md:flex-row items-center gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#D1E1CB] shrink-0">
          <Smartphone className="w-12 h-12 text-[#4B5E40] animate-pulse" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#2D2D2A] tracking-tight">Connect Your Alert Device</h1>
          <p className="text-[#3E3E3B] max-w-xl leading-relaxed text-sm md:text-base">
            Enable instant browser notifications on your smartphone or PC. No app stores needed. Once connected, CivicAlert will push immediate reports straight to your system tray.
          </p>
        </div>
      </div>

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Registration Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#E5E1D8] shadow-sm md:col-span-7 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#2D2D2A] flex items-center gap-2 font-display">
              <Cpu className="w-5 h-5 text-[#4B5E40]" />
              1-Click Connection Portal
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Device Nickname</label>
              <input
                type="text"
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="e.g. My Pixel 8, Office PC"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E1D8] outline-none focus:border-[#4B5E40] focus:ring-1 focus:ring-[#4B5E40] transition-all font-sans text-sm"
              />
            </div>

            {/* Diagnostics details */}
            <div className="space-y-2 bg-[#FDFCF9] rounded-xl p-4 border border-[#E5E1D8]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium font-sans">Notification Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase font-mono ${
                  permissionState === 'granted' 
                    ? 'bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB]' 
                    : permissionState === 'denied' 
                      ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
                }`}>
                  {permissionState === 'default' ? 'Unknown/Default' : permissionState}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 leading-relaxed font-sans">
                {permissionState === 'granted' 
                  ? '✓ CivicAlert is verified to deliver silent background and high priority chime notifications directly.'
                  : permissionState === 'denied'
                    ? '❌ Blocked. Reset site settings in your browser address bar to grant notifications permission.'
                    : '⏳ Awaiting permission request. Setup to bind device socket.'}
              </div>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-xl text-xs leading-relaxed font-sans border ${
                statusMessage.type === 'success'
                  ? 'bg-[#ECF3E9] border-[#D1E1CB] text-green-800'
                  : statusMessage.type === 'err'
                    ? 'bg-rose-50 border-rose-100 text-rose-800'
                    : 'bg-[#ECF3E9] border-[#D1E1CB] text-[#4B5E40] animate-pulse font-medium'
              }`}>
                {statusMessage.text}
              </div>
            )}
          </div>

          <button
            onClick={handleRegisterNotification}
            disabled={isSubscribing}
            className="w-full bg-[#4B5E40] hover:bg-[#3D4F33] active:translate-y-[1px] disabled:bg-[#BFB9AA] text-white font-bold py-3 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <BellRing className={`w-4 text-white ${isSubscribing ? 'animate-spin' : ''}`} />
            {isSubscribing ? 'Synchronizing Device...' : 'Connect This Device'}
          </button>
        </div>

        {/* Info panel / Explainer */}
        <div className="bg-[#2D2D2A] text-[#F7F5F0] rounded-2xl p-6 border border-stone-800 shadow-xl md:col-span-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2 font-display">
              <HelpCircle className="w-5 h-5 text-[#88B378]" />
              How Alerts Arrive
            </h2>

            <div className="space-y-3.5 text-xs text-stone-200 leading-relaxed font-sans">
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-stone-800 text-[#ECF3E9] font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-white">Browser Key Handshake</h4>
                  <p className="text-[#BFB9AA] mt-0.5 font-sans">We subscribe to browser-native PushManager. It produces a unique socket-token endpoint.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-stone-800 text-[#ECF3E9] font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-white">Secure Server Vault</h4>
                  <p className="text-[#BFB9AA] mt-0.5 font-sans">The registration token is logged into the backend. No personal identity is ever tied, cataloged, or requested.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-stone-800 text-[#ECF3E9] font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-white">Background Delivery</h4>
                  <p className="text-[#BFB9AA] mt-0.5 font-sans">When public issues get created, our backend fires VAPID payloads, telling the browser to vibrate your device instantly.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-800/80 pt-4 mt-6 text-[10px] text-gray-500 font-mono text-center">
             ENCRYPTION PROTOCOL: AES-GCM 256
          </div>
        </div>
      </div>

      {/* Connected Terminals Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5E1D8] shadow-sm space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-sans flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Active Connected Devices List ({connectedDevices.length})
        </h3>

        {connectedDevices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm font-sans">
            No devices configured yet. Complete the 1-click binding portal above to trigger your first notification alert.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-2.5 pb-3">Device Label</th>
                  <th className="py-2.5 pb-3 text-center md:text-left">Device ID / Connection Token</th>
                  <th className="py-2.5 pb-3">Registered At</th>
                  <th className="py-2.5 pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {connectedDevices.map((device) => (
                  <tr key={device.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-semibold text-[#2D2D2A] flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#4B5E40]/70" />
                      {device.label}
                      {device.id === storedDeviceId && (
                        <span className="bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          This Phone
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400 font-mono">
                      <span className="block max-w-[200px] truncate md:max-w-none text-center md:text-left text-[11px] bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                        {device.id}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(device.connectedAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDisconnectDevice(device.id)}
                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs rounded transition-all cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3.5" />
                        Disconnect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
