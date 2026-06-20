import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, MapPin, ShieldAlert, Sparkles, AlertCircle, 
  ArrowRight, Smartphone, CheckCircle, ShieldCheck, Home, 
  ShieldAlert as AdminIcon, LogOut, Radio
} from 'lucide-react';

import type { CivicReport, ViewType } from './types';
import HomeView from './components/HomeView';
import ReportForm from './components/ReportForm';
import DeviceConnect from './components/DeviceConnect';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import IssueDetail from './components/IssueDetail';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  
  // Single report details inspector popup context (e.g. if arriving from push link click)
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    // Check administrative authorization cache on boot
    const cachedToken = localStorage.getItem('civicalert_admin_token');
    if (cachedToken) {
      setAdminToken(cachedToken);
    }

    // Capture incoming Service Worker postMessages for in-app alert navigation pivots!
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'navigate') {
          console.log('[App] Switched view from Push click:', event.data.url);
          handleNotificationNavigation(event.data.url);
        }
      });
    }

    // Capture Leaflet popup dispatch view triggers
    const handleViewReportEvent = (e: Event) => {
      const repId = (e as CustomEvent).detail;
      if (repId) {
        setHighlightedId(repId);
        setView('detail');
      }
    };
    window.addEventListener('view-report', handleViewReportEvent);

    fetchReports();

    return () => {
      window.removeEventListener('view-report', handleViewReportEvent);
    };
  }, [adminToken]);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error('Failed to query reports from server:', e);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleNotificationNavigation = (url: string) => {
    // Parse URL (e.g. /report/rep_170000000)
    if (url.includes('/report/')) {
      const id = url.split('/report/')[1];
      if (id) {
        setHighlightedId(id);
        setView('detail');
      }
    } else {
      setView('home');
    }
  };

  const handleAdminLogin = (token: string) => {
    localStorage.setItem('civicalert_admin_token', token);
    setAdminToken(token);
    setView('admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('civicalert_admin_token');
    setAdminToken(null);
    setView('home');
  };

  const handleReportSuccess = (newReport: CivicReport) => {
    fetchReports();
    // Swap view back to Home to let citizens see their record logged on map!
    setView('home');
  };

  const handleInspectReport = (id: string) => {
    setHighlightedId(id);
    setView('detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E1D8] px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setView('home')}>
          <div className="bg-[#4B5E40] p-2 rounded-xl text-white shadow-md shadow-[#4B5E40]/15">
            <Radio className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <span className="font-display font-bold text-[#2D2D2A] tracking-tight text-lg">CivicAlert</span>
            <span className="hidden sm:inline-block text-[10px] bg-[#ECF3E9] text-[#4B5E40] ml-2 px-1.5 py-0.5 rounded font-mono font-bold">
              v1.0 (PWA)
            </span>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <button
            onClick={() => setView('home')}
            className={`px-4 py-2 rounded-xl transition-all ${
              view === 'home' ? 'bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] font-semibold' : 'text-slate-600 hover:bg-[#ECF3E9]/30'
            }`}
          >
            Home Overview
          </button>
          <button
            onClick={() => setView('report')}
            className={`px-4 py-2 rounded-xl transition-all ${
              view === 'report' ? 'bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] font-semibold' : 'text-slate-600 hover:bg-[#ECF3E9]/30'
            }`}
          >
            File Citizen Report
          </button>
          <button
            onClick={() => setView('connect')}
            className={`px-4 py-2 rounded-xl transition-all ${
              view === 'connect' ? 'bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] font-semibold' : 'text-slate-600 hover:bg-[#ECF3E9]/30'
            }`}
          >
            Connect My Device
          </button>
          
          <div className="h-4 w-[1px] bg-[#E5E1D8] mx-2"></div>
          
          {adminToken ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setView('admin')}
                className={`px-4 py-2 rounded-xl border border-[#D1E1CB] text-[#4B5E40] hover:bg-[#ECF3E9] font-semibold flex items-center gap-1.5 transition-all ${
                  view === 'admin' ? 'bg-[#ECF3E9] border-[#D1E1CB]' : 'bg-[#ECF3E9]/25'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Dashboard
              </button>
              <button
                onClick={handleAdminLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="Admin Logout"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('login')}
              className={`px-4 py-2 rounded-xl border border-[#E5E1D8] hover:bg-[#ECF3E9]/30 flex items-center gap-1.5 text-slate-700 transition-all ${
                view === 'login' ? 'bg-[#ECF3E9] text-[#4B5E40] border-[#D1E1CB] font-bold' : ''
              }`}
            >
              <AdminIcon className="w-4 h-4 text-[#4B5E40]" />
              Admin Portal
            </button>
          )}
        </nav>

        {/* Rightmost Mobile state indicators */}
        <div className="md:hidden flex items-center gap-2">
          {adminToken ? (
            <button
              onClick={() => setView('admin')}
              className="p-2 bg-[#ECF3E9] text-[#4B5E40] rounded-xl border border-[#D1E1CB]"
              title="Admin Dashboard"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setView('login')}
              className="p-2 bg-[#FDFCF9] text-slate-600 rounded-xl border border-[#E5E1D8]"
              title="Admin Sign In"
            >
              <AdminIcon className="w-4 h-4 text-[#4B5E40]" />
            </button>
          )}
        </div>
      </header>

      {/* Primary content area */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full"
          >
            {view === 'home' && (
              <HomeView
                reports={reports}
                onNavigate={setView}
                onSelectReport={handleInspectReport}
              />
            )}

            {view === 'report' && (
              <ReportForm onSuccess={handleReportSuccess} />
            )}

            {view === 'connect' && (
              <DeviceConnect />
            )}

            {view === 'login' && (
              <AdminLogin onLoginSuccess={handleAdminLogin} />
            )}

            {view === 'admin' && adminToken && (
              <AdminDashboard
                reports={reports}
                onRefresh={fetchReports}
                onSelectReport={handleInspectReport}
              />
            )}

            {view === 'detail' && (
              <IssueDetail
                reportId={highlightedId}
                onBack={setView}
                reports={reports}
                onRefresh={fetchReports}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Sticky Bottom Tab Bar */}
      <footer className="md:hidden fixed bottom-5 left-4 right-4 z-50 bg-[#2D2D2A]/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-stone-800 flex items-center justify-around text-stone-300">
        <button
          onClick={() => setView('home')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            view === 'home' ? 'text-[#88B378] bg-white/5 font-bold' : 'text-stone-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setView('report')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            view === 'report' ? 'text-[#88B378] bg-white/5 font-bold' : 'text-stone-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[10px]">Report</span>
        </button>

        <button
          onClick={() => setView('connect')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            view === 'connect' ? 'text-[#88B378] bg-white/5 font-bold' : 'text-stone-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px]">Connect</span>
        </button>

        {adminToken ? (
          <button
            onClick={() => setView('admin')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'admin' ? 'text-[#88B378] bg-white/5 font-bold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setView('login')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'login' || view === 'detail' ? 'text-[#88B378] bg-white/5 font-bold' : 'text-stone-400 hover:text-white'
            }`}
          >
            <AdminIcon className="w-5 h-5" />
            <span className="text-[10px]">{view === 'detail' ? 'Detail' : 'Log In'}</span>
          </button>
        )}
      </footer>

    </div>
  );
}
