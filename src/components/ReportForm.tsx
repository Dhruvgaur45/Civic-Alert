import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Image as ImageIcon, CheckCircle2, ShieldAlert, Upload, Sparkles } from 'lucide-react';
import MapView from './MapView';
import type { CivicReport } from '../types';

interface ReportFormProps {
  onSuccess: (newReport: CivicReport) => void;
}

const CATEGORIES = [
  'Pothole',
  'Garbage',
  'Streetlight',
  'Water Leakage',
  'Public Complaint',
  'Other'
];

export default function ReportForm({ onSuccess }: ReportFormProps) {
  const [category, setCategory] = useState('Pothole');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  // Location states
  const [lat, setLat] = useState<number>(37.7749);
  const [lng, setLng] = useState<number>(-122.4194);
  const [address, setAddress] = useState('Civic Plaza, San Francisco, CA');
  const [isDetecting, setIsDetecting] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  
  // Image states
  const [imageEncoded, setImageEncoded] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic status feedback updates
  useEffect(() => {
    // Attempt to seed user's current coordinates on active entry
    handleDetectGPS(true);
  }, []);

  // Reverse Geocoding via OSM Nominatim API to get human readable address
  const fetchAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (e) {
      console.warn('Could not reverse geocode coord:', e);
      // Fallback
      setAddress(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
    }
  };

  const handleDetectGPS = (silent = false) => {
    if (!('geolocation' in navigator)) {
      if (!silent) setErrorMessage('GPS sensor is not accessible on this device.');
      return;
    }

    if (!silent) setIsDetecting(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setMapCenter([userLat, userLng]);
        
        await fetchAddressFromCoords(userLat, userLng);
        setIsDetecting(false);
      },
      (err) => {
        console.warn('Geolocation sensor error code:', err.code, err.message);
        if (!silent) {
          setErrorMessage('Could not auto-detect location. Please pick custom coordinate coordinates manually on the map.');
        }
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setLat(clickedLat);
    setLng(clickedLng);
    await fetchAddressFromCoords(clickedLat, clickedLng);
  };

  // Drag and drop controls
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    // Check file is image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Upload must be a valid image file (PNG, JPG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setImageEncoded(base64data);
      setImagePreview(base64data);
      setErrorMessage(null);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!description.trim()) {
      setErrorMessage('Description text is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category,
        description,
        image: imageEncoded,
        location: {
          lat,
          lng,
          address
        },
        priority
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Civic submission gateway failed. Please retry.');
      }

      const newReport: CivicReport = await res.json();
      setSuccessMessage(`Report submitted successfully! Category matched. Checked duplicates. alert sent to Connected Devices.`);
      
      // Wipe fields
      setDescription('');
      setImageEncoded('');
      setImagePreview('');

      // Invoke success handler
      setTimeout(() => {
        onSuccess(newReport);
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Container (Left Column) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-[#E5E1D8] shadow-sm lg:col-span-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
            <h2 className="text-xl font-display font-medium text-[#2D2D2A] tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#4B5E40]" />
              File Citizen Alert
            </h2>
            <span className="text-[11px] bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] font-mono px-2 py-0.5 rounded font-bold">
              GPS SENSOR: ONLINE
            </span>
          </div>

          {/* Issue category drop-down */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                    category === cat
                      ? 'bg-[#4B5E40] border-[#4B5E40] text-white shadow-sm font-bold'
                      : 'bg-[#FDFCF9] border-[#E5E1D8] text-[#2D2D2A] hover:border-[#BFB9AA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide concrete info: Street name landmark, approximate size, any hazards caused..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] text-sm outline-none focus:border-[#4B5E40] focus:ring-1 focus:ring-[#4B5E40] transition-all text-[#2D2D2A] leading-relaxed resize-none"
              required
            ></textarea>
          </div>

          {/* Severity Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Initial Priority Tier</label>
            <div className="flex gap-4">
              {(['Low', 'Medium', 'High'] as const).map((p) => (
                <label key={p} className="flex items-center gap-2 text-xs font-bold text-[#2D2D2A] cursor-pointer select-none">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="w-4 h-4 text-[#4B5E40] border-[#E5E1D8] focus:ring-[#4B5E40]"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Image Upload Area with Drag and Drop */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attach Photo (Optional)</label>
            
            {!imagePreview ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  dragActive 
                    ? 'border-[#4B5E40] bg-[#ECF3E9]' 
                    : 'border-[#E5E1D8] hover:border-[#BFB9AA] bg-[#FDFCF9]'
                }`}
                onClick={() => document.getElementById('image-upload-input')?.click()}
              >
                <div className="bg-white p-2.5 rounded-full shadow-sm border border-[#E5E1D8]">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-xs text-gray-600 font-sans">
                  <span className="text-[#4B5E40] font-bold font-sans">Click to upload</span> or drag and drop
                </div>
                <div className="text-[10px] text-gray-400">PNG or JPG, up to 10MB</div>
                <input
                  id="image-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#FDFCF9] p-2 flex items-center justify-between gap-4">
                <img
                  src={imagePreview}
                  alt="Incident upload preview"
                  className="h-16 w-24 object-cover rounded-lg border border-[#E5E1D8]"
                />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-slate-700 max-w-[150px] truncate">Selected Image</div>
                  <div className="text-slate-400 font-mono text-[10px]">Embedded base64 content active</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setImageEncoded('');
                  }}
                  className="mr-2 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-slate-600 font-semibold text-[10px] rounded"
                >
                  Clear File
                </button>
              </div>
            )}
          </div>

          {/* Feedback details */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl leading-relaxed">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-[#ECF3E9] border border-[#D1E1CB] text-[#4B5E40] text-xs rounded-xl flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4B5E40]" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#4B5E40] hover:bg-[#3D4F33] active:translate-y-[1px] disabled:bg-[#BFB9AA] text-white py-3 px-4 rounded-xl shadow font-semibold text-sm transition-all text-center cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing and dispatching rules...</span>
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </form>

        {/* Location picker map panel (Right Column) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E1D8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="font-semibold text-[#2D2D2A] flex items-center gap-1.5 text-sm md:text-base font-display">
                  <MapPin className="w-4 h-4 text-[#4B5E40]" />
                  Define Location coordinates
                </h3>
                <p className="text-[11px] text-[#2D2D2A]/60 font-sans mt-0.5">Click directly on map or use dynamic GPS sensor below</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleDetectGPS(false)}
                disabled={isDetecting}
                className="w-full sm:w-auto bg-[#2D2D2A] text-white font-semibold hover:bg-stone-800 text-xs py-2.5 px-3.5 rounded-xl border border-transparent transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Navigation className={`w-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                {isDetecting ? 'Detecting...' : 'Auto-locate GPS'}
              </button>
            </div>

            {/* Displaying address info */}
            <div className="bg-[#FDFCF9] rounded-xl p-3 border border-[#E5E1D8] font-sans text-xs flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#4B5E40] font-bold font-sans uppercase text-[10px] tracking-wider">
                <Sparkles className="w-3.5 text-[#4B5E40]" /> Auto-Generated Address Details
              </div>
              <div className="text-gray-700 leading-relaxed font-sans">{address}</div>
              <div className="text-[10px] text-gray-400 font-mono mt-1">
                COORDINATES: {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            </div>

            {/* Embeddable Map Canvas */}
            <div className="h-[300px] sm:h-[400px] rounded-2xl overflow-hidden border border-[#E5E1D8]">
              <MapView
                onLocationSelect={handleMapClick}
                selectedLocation={{ lat, lng }}
                center={mapCenter}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
