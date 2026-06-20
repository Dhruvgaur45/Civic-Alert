import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CivicReport } from '../types';

interface MapViewProps {
  reports?: CivicReport[];
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  center?: [number, number];
}

// Leaflet Default Marker Icon Fix
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export default function MapView({
  reports = [],
  onLocationSelect,
  selectedLocation,
  center = [37.7749, -122.4194], // Centered on SF by default, but adapts to GPS
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fixLeafletIcons();

    if (!mapContainerRef.current) return;

    // Use a clean, safe container sizing resize element
    const container = mapContainerRef.current;
    
    // Create map instance
    const leafletMap = L.map(container, {
      center: center,
      zoom: 13,
      layers: [], // Start with empty layers
    });

    // Add beautiful OpenStreetMap tile layers
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafletMap);

    // Initialise layer group for report pins
    const markerGroup = L.layerGroup().addTo(leafletMap);
    
    mapInstanceRef.current = leafletMap;
    markerGroupRef.current = markerGroup;
    setMapReady(true);

    // Handle clicks for manual coordinate extraction
    if (onLocationSelect) {
      leafletMap.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });
    }

    // Leaflet requires invalidating layout if size changes
    const resizeObserver = new ResizeObserver(() => {
      leafletMap.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      leafletMap.off();
      leafletMap.remove();
      mapInstanceRef.current = null;
      markerGroupRef.current = null;
      clickMarkerRef.current = null;
    };
  }, []);

  // Update central position context
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }
  }, [center]);

  // Render existing report markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markerGroupRef.current) return;

    // Wipe previous layers
    markerGroupRef.current.clearLayers();

    reports.forEach((rep) => {
      // Choose marker properties depending on issue priority & repeated status
      const colorClass = rep.isRepeated 
        ? 'rose-500 font-bold border-2 border-rose-600' 
        : rep.priority === 'High' 
          ? 'red-500' 
          : rep.priority === 'Medium' 
            ? 'amber-500' 
            : 'sky-500';

      const repeatedBadge = rep.isRepeated 
        ? `<div class="absolute -top-3 -right-3 bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[9px] border border-white font-bold animate-pulse">REPEATED (${rep.repeatedCount})</div>` 
        : '';

      const markerHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border-2 border-slate-700">
          <div class="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style="background-color: ${
            rep.isRepeated 
              ? '#f43f5e' 
              : rep.priority === 'High' 
                ? '#ef4444' 
                : rep.priority === 'Medium' 
                  ? '#f59e0b' 
                  : '#38bdf8'
          }">
            ${rep.category.substring(0, 1)}
          </div>
          ${repeatedBadge}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const popupContent = `
        <div class="p-2 select-none min-w-[200px]">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-slate-800 text-sm">${rep.category}</span>
            <span class="px-1.5 py-0.5 text-[10px] rounded font-semibold text-slate-700 shrink-0 ${
              rep.status === 'Resolved' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : rep.status === 'In Progress' 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
            }">${rep.status}</span>
          </div>
          <p class="text-xs text-slate-600 line-clamp-2 my-1 leading-relaxed">${rep.description}</p>
          <div class="text-[10px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
             📍 ${rep.location.address}
          </div>
          ${rep.isRepeated ? `<div class="mt-1 text-[10px] text-rose-600 font-bold">⚠️ Reported ${rep.repeatedCount} times recently!</div>` : ''}
          <button onclick="window.dispatchEvent(new CustomEvent('view-report', {detail: '${rep.id}'}))" class="mt-2 w-full py-1 text-center bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs rounded transition-colors cursor-pointer">
            View Details
          </button>
        </div>
      `;

      L.marker([rep.location.lat, rep.location.lng], { icon: customIcon })
        .addTo(markerGroupRef.current!)
        .bindPopup(popupContent);
    });
  }, [reports, mapReady]);

  // Update dynamic manual selection highlight pin
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    if (selectedLocation) {
      const { lat, lng } = selectedLocation;
      
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const primarySelectorIcon = L.divIcon({
          html: `
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-sky-600/20 border-2 border-sky-500 animate-pulse">
              <div class="w-3 h-3 rounded-full bg-sky-600"></div>
            </div>
          `,
          className: 'selector-leaflet-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        clickMarkerRef.current = L.marker([lat, lng], { icon: primarySelectorIcon })
          .addTo(mapInstanceRef.current);
      }

      // Smooth pan to selection
      mapInstanceRef.current.panTo([lat, lng]);
    } else {
      if (clickMarkerRef.current && mapInstanceRef.current) {
        clickMarkerRef.current.remove();
        clickMarkerRef.current = null;
      }
    }
  }, [selectedLocation, mapReady]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-100">
      <div id="map-canvas-div" ref={mapContainerRef} className="w-full h-full min-h-[250px] z-[1]"></div>
      
      {/* Dynamic Overlay Info Banner */}
      <div className="absolute bottom-2 left-2 z-[10] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200/50 text-[11px] font-medium text-slate-700 select-none flex items-center gap-1.5">
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        OpenStreetMap Sandbox Mode Active
      </div>
    </div>
  );
}
