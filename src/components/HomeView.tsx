import { 
  Building2, MapPin, ShieldAlert, Sparkles, AlertCircle, 
  ArrowRight, Landmark, Zap, Smartphone, CheckCircle, Flame 
} from 'lucide-react';
import MapView from './MapView';
import type { CivicReport, ViewType } from '../types';

interface HomeViewProps {
  reports: CivicReport[];
  onNavigate: (view: ViewType) => void;
  onSelectReport: (reportId: string) => void;
}

export default function HomeView({ reports, onNavigate, onSelectReport }: HomeViewProps) {
  
  // Stats
  const totalCount = reports.length;
  const activeIssues = reports.filter(r => r.status !== 'Resolved').length;
  const resolvedIssues = reports.filter(r => r.status === 'Resolved').length;
  const criticalIssues = reports.filter(r => r.priority === 'High' && r.status !== 'Resolved').length;

  // Recent 5 issues
  const recentReports = reports.slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Hero Welcome Banner */}
      <div className="bg-[#4B5E40] rounded-3xl p-6 md:p-10 text-white relative overflow-hidden border border-[#D1E1CB]/20 shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-white/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-[#ECF3E9] border border-white/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Civic Technology Platform
          </div>
          
          <h1 className="text-3.5xl md:text-5xl font-display font-medium tracking-tight leading-tight">
            Fixing Neighborhood Issues, <span className="text-[#ECF3E9] font-bold">Instantly</span> Connected.
          </h1>
          
          <p className="text-[#ECF3E9]/85 font-sans text-sm md:text-base leading-relaxed">
            Report broken streetlights, water leakages, garbage compile points, potholes, and civic disputes. Connect your smartphone in one-click to receive instant sound alerts as incidents arise near your district.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => onNavigate('report')}
              className="px-6 py-3 bg-white hover:bg-[#ECF3E9] text-[#4B5E40] font-bold rounded-xl text-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ShieldAlert className="w-4 h-4 text-[#4B5E40]" />
              Report Civic Issue
            </button>
            <button
              onClick={() => onNavigate('connect')}
              className="px-6 py-3 bg-[#3D4F33] hover:bg-[#2D3E25] text-white font-semibold rounded-xl text-sm transition-all text-center flex items-center justify-center gap-2 border border-white/10 cursor-pointer shadow-sm"
            >
              <Smartphone className="w-4 h-4 text-[#88B378] animate-pulse" />
              Connect My Phone Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#ECF3E9] rounded-xl border border-[#D1E1CB] shrink-0">
            <Landmark className="w-6 h-6 text-[#4B5E40]" />
          </div>
          <div className="space-y-0.5">
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-sans">Total Reports</div>
            <div className="text-2xl font-bold text-[#2D2D2A]">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="space-y-0.5">
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-sans">Active Incidents</div>
            <div className="text-2xl font-bold text-[#2D2D2A]">{activeIssues}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#ECF3E9]/60 rounded-xl border border-[#D1E1CB]/60 shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-0.5">
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-sans">Issues Resolved</div>
            <div className="text-2xl font-bold text-[#2D2D2A]">{resolvedIssues}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 shrink-0">
            <Flame className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-0.5">
            <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-sans">High Severity Spots</div>
            <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
          </div>
        </div>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* OpenStreetMap Map Section (Left Column) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="border-b border-[#E5E1D8] pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#4B5E40] text-sm md:text-base flex items-center gap-1.5 font-display">
                <Building2 className="w-4 h-4 text-[#4B5E40]" />
                Active Incidents Heat Map
              </h3>
              <p className="text-[11px] text-gray-500 font-sans mt-0.5">Recent citizen complaints plotted in real-time</p>
            </div>
            
            <button
              onClick={() => onNavigate('report')}
              className="text-xs text-[#4B5E40] hover:text-[#3D4F33] font-bold flex items-center gap-0.5 bg-transparent border-0 cursor-pointer"
            >
              Filing Form <ArrowRight className="w-3.5" />
            </button>
          </div>

          <div className="h-[350px] sm:h-[400px] rounded-2xl overflow-hidden border border-[#E5E1D8]">
            <MapView
              reports={reports}
              center={reports.length > 0 ? [reports[0].location.lat, reports[0].location.lng] : [37.7749, -122.4194]}
            />
          </div>
        </div>

        {/* Live Feed Scrolling List (Right Column) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#E5E1D8] shadow-sm space-y-4 flex flex-col justify-between h-full min-h-[400px]">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm md:text-base border-b border-[#E5E1D8] pb-3">
              📢 Live Reporting Feed
            </h3>

            {recentReports.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-xs font-sans">
                No active complaints reported yet. Be the first to file!
              </div>
            ) : (
              <div className="divide-y divide-[#E5E1D8] overflow-y-auto max-h-[340px] pr-1 space-y-3 pt-2">
                {recentReports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => onSelectReport(rep.id)}
                    className="group cursor-pointer select-none space-y-1 pt-3 pb-1 hover:bg-[#ECF3E9]/40 p-2 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{rep.category}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        rep.priority === 'High' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-[#ECF3E9] text-[#4B5E40]'
                      }`}>
                        {rep.priority}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {rep.description}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1 font-sans">
                      <span className="truncate max-w-[170px]">📍 {rep.location.address}</span>
                      <span className="shrink-0">{new Date(rep.createdAt).toLocaleDateString()}</span>
                    </div>

                    {rep.isRepeated && (
                      <div className="text-[8px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 font-extrabold w-fit mt-1 uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-red-600 inline text-red-600" />
                        REPEATED HOTSPOT
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#E5E1D8] pt-3 mt-4 text-center">
            <div className="text-[11px] text-gray-400 font-medium font-sans">
              App fully offline-capable. Registered PWA sandbox.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
