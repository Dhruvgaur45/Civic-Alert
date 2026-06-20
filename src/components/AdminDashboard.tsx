import { useState, useEffect } from 'react';
import { 
  Filter, Layers, ListFilter, AlertTriangle, CheckSquare, 
  Clock, RotateCcw, ShieldAlert, Trash2, ArrowUpDown, 
  MapPin, RefreshCw, Eye, AlertCircle, Sparkles, SlidersHorizontal 
} from 'lucide-react';
import MapView from './MapView';
import type { CivicReport } from '../types';

interface AdminDashboardProps {
  reports: CivicReport[];
  onRefresh: () => void;
  onSelectReport: (reportId: string) => void;
}

export default function AdminDashboard({ reports, onRefresh, onSelectReport }: AdminDashboardProps) {
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterRepeatedOnly, setFilterRepeatedOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'repeatedCount'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Interactive Inspector Context
  const [selectedRep, setSelectedRep] = useState<CivicReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync selected item in case list updates
  useEffect(() => {
    if (selectedRep) {
      const fresh = reports.find(r => r.id === selectedRep.id);
      if (fresh) setSelectedRep(fresh);
    }
  }, [reports]);

  // Statistics
  const totalCount = reports.length;
  const newCount = reports.filter(r => r.status === 'New').length;
  const inProgressCount = reports.filter(r => r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const repeatedCountTotal = reports.filter(r => r.isRepeated).length;

  // Filter application
  const filteredReports = reports.filter(rep => {
    const matchesCategory = filterCategory === 'All' || rep.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || rep.status === filterStatus;
    const matchesRepeated = !filterRepeatedOnly || rep.isRepeated;
    
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      rep.description.toLowerCase().includes(term) || 
      rep.location.address.toLowerCase().includes(term) ||
      rep.category.toLowerCase().includes(term);

    return matchesCategory && matchesStatus && matchesRepeated && matchesSearch;
  });

  // Sort application
  const sortedReports = [...filteredReports].sort((a, b) => {
    let checkA: any = a[sortBy];
    let checkB: any = b[sortBy];

    // Priority custom mapping weights
    if (sortBy === 'priority') {
      const weight = { 'High': 3, 'Medium': 2, 'Low': 1 };
      checkA = weight[a.priority] || 0;
      checkB = weight[b.priority] || 0;
    } else if (sortBy === 'createdAt') {
      checkA = new Date(a.createdAt).getTime();
      checkB = new Date(b.createdAt).getTime();
    }

    if (checkA < checkB) return sortDirection === 'asc' ? -1 : 1;
    if (checkA > checkB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Status updates
  const handleUpdateStatus = async (id: string, nextStatus: CivicReport['status']) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedRep(updated);
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to change status details:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Priority updates
  const handleUpdatePriority = async (id: string, nextPriority: CivicReport['priority']) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedRep(updated);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Incident erasure
  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you absolute sure you want to permanently delete this report data? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedRep(null);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="text-gray-400 font-bold text-xs font-sans uppercase">Total Filings</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#2D2D2A]">{totalCount}</span>
            <span className="text-xs bg-[#ECF3E9] text-[#4B5E40] border border-[#D1E1CB] px-1.5 py-0.5 rounded font-bold">All Stats</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="text-gray-400 font-bold text-xs font-sans uppercase">New/Unassigned</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-rose-600">{newCount}</span>
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="text-gray-400 font-bold text-xs font-sans uppercase">In Progress</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-500">{inProgressCount}</span>
            <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">Active</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-1">
          <div className="text-gray-400 font-bold text-xs font-sans uppercase text-rose-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Repeated Spots
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-red-600">{repeatedCountTotal}</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">⚠️ Warning</span>
          </div>
        </div>
      </div>

      {/* Main Panel Division */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table List & Controls (Left Column) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E1D8] shadow-sm space-y-4">
            
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
              <div className="flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-slate-800">Filings Database Control</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Filter by keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E5E1D8] text-xs w-full sm:w-48 outline-none focus:border-[#4B5E40] focus:ring-1 focus:ring-[#4B5E40] font-sans text-slate-800"
                />
                
                <button
                  onClick={onRefresh}
                  className="p-1.5 text-slate-600 hover:bg-[#ECF3E9] rounded-xl transition-colors cursor-pointer ml-auto md:ml-0 border border-[#E5E1D8]"
                  title="Force DB Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-[#4B5E40]" />
                </button>
              </div>
            </div>

            {/* Quick Filter Pill Rows */}
            <div className="flex flex-wrap items-center gap-3 bg-[#FDFCF9] p-2 rounded-xl border border-[#E5E1D8]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase px-2">
                <SlidersHorizontal className="w-3 text-[#4B5E40]" /> Category:
              </div>
              {['All', 'Pothole', 'Garbage', 'Streetlight', 'Water Leakage', 'Public Complaint', 'Other'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg cursor-pointer transition-all ${
                    filterCategory === cat
                      ? 'bg-[#4B5E40] text-white font-bold shadow-sm'
                      : 'bg-white border border-[#E5E1D8] text-[#2D2D2A] hover:border-[#BFB9AA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status filters & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border border-[#E5E1D8] rounded-lg px-2 py-1 outline-none focus:border-[#4B5E40] text-slate-800"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Reopened">Reopened</option>
                </select>
              </div>

              <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterRepeatedOnly}
                  onChange={(e) => setFilterRepeatedOnly(e.target.checked)}
                  className="rounded text-[#4B5E40] border-[#E5E1D8] focus:ring-[#4B5E40] w-4 h-4"
                />
                <span className="text-rose-600 font-extrabold text-xs flex items-center gap-1 shrink-0">
                  ⚠️ Limit to Reappearing Disputes Only
                </span>
              </label>
            </div>

            {/* Tabular Lists */}
            {sortedReports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-sans">
                No reports matched the specified category filter parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm font-sans">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium select-none">
                      <th className="py-2 pb-3 pl-2">Category</th>
                      <th className="py-2 pb-3">District Location</th>
                      <th className="py-2 pb-3">
                        <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 hover:text-slate-600 font-medium text-xs bg-transparent border-0 outline-none cursor-pointer">
                          Priority <ArrowUpDown className="w-3" />
                        </button>
                      </th>
                      <th className="py-2 pb-3">Status</th>
                      <th className="py-2 pb-3">
                        <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-slate-600 font-medium text-xs bg-transparent border-0 outline-none cursor-pointer">
                          Date <ArrowUpDown className="w-3" />
                        </button>
                      </th>
                      <th className="py-2 pb-3 text-right pr-2">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedReports.map((rep) => (
                      <tr 
                        key={rep.id} 
                        className={`hover:bg-[#ECF3E9]/20 transition-colors cursor-pointer ${
                          selectedRep?.id === rep.id ? 'bg-[#ECF3E9]/30 font-semibold border-l-2 border-[#4B5E40]' : ''
                        }`}
                        onClick={() => setSelectedRep(rep)}
                      >
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              rep.isRepeated ? 'bg-rose-500' : 'bg-stone-300'
                            }`} />
                            <div className="font-bold text-[#2D2D2A]">{rep.category}</div>
                          </div>
                          {rep.isRepeated && (
                            <div className="text-[9px] text-red-600 font-extrabold ml-4 animate-pulse uppercase tracking-wide">
                              ⚠️ REPEATED ({rep.repeatedCount}x)
                            </div>
                          )}
                        </td>
                        <td className="py-3 max-w-[150px] truncate md:max-w-xs text-stone-500 font-sans" title={rep.location.address}>
                          {rep.location.address}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rep.priority === 'High' 
                              ? 'bg-rose-100 text-rose-800' 
                              : rep.priority === 'Medium' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {rep.priority}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                            rep.status === 'Resolved' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : rep.status === 'In Progress'
                                ? 'bg-amber-100 text-amber-800 animate-pulse border border-amber-200'
                                : rep.status === 'Reopened'
                                  ? 'bg-[#ECF3E9] text-[#4B5E40] font-bold border border-[#D1E1CB]'
                                  : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-3 text-[11px] text-slate-400">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRep(rep);
                            }}
                            className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors border-0 outline-none cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

        {/* Dynamic Detail Inspector Section (Right Column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E5E1D8] shadow-sm space-y-4 min-h-[400px]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 font-sans border-b border-[#E5E1D8] pb-2">
              📋 Report Inspector
            </h3>

            {!selectedRep ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                <AlertCircle className="w-8 h-8 text-gray-300" />
                <p className="text-xs text-gray-400 max-w-[200px]">
                  Select an incident from the database list to inspect coordinates, photos, updates, and duplicates.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in font-sans text-xs">
                
                {/* Category header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Report details</span>
                    <span className="text-[10px] text-gray-400 font-mono">{selectedRep.id}</span>
                  </div>
                  <h4 className="text-base font-bold text-[#2D2D2A] flex items-center gap-1.5">
                    {selectedRep.category}
                  </h4>
                </div>

                {/* Duplicated Warning Highlights */}
                {selectedRep.isRepeated && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1">
                    <div className="text-red-700 font-extrabold flex items-center gap-1 text-[11px] uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      Repeated Community Dispute Spot
                    </div>
                    <p className="text-red-600/95 leading-relaxed text-[11px]">
                      This category has been reported within **500 meters** of this location **{selectedRep.repeatedCount} times** recently! Track this closely to resolve structural patterns.
                    </p>
                  </div>
                )}

                {/* Submited Photo */}
                <div className="space-y-1">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Citizen Attached Image</span>
                  {selectedRep.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#E5E1D8] bg-slate-50 h-44 shadow-inner">
                      <img
                        src={selectedRep.image}
                        alt="Incident"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#E5E1D8] bg-slate-50 h-28 flex flex-col items-center justify-center gap-1 text-gray-400 text-[11px]">
                      <span>No image attached by user</span>
                    </div>
                  )}
                </div>

                {/* Description details */}
                <div className="space-y-1">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Description text</span>
                  <div className="bg-[#FDFCF9] p-3 rounded-xl border border-[#E5E1D8] text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedRep.description}
                  </div>
                </div>

                {/* Location text details */}
                <div className="space-y-1 flex items-start gap-1 p-2 bg-[#ECF3E9]/40 rounded-xl border border-[#D1E1CB]">
                  <MapPin className="w-4 h-4 text-[#4B5E40] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#4B5E40]">Location coordinates</div>
                    <p className="text-[11px] text-[#2D2D2A]/80 leading-relaxed font-sans">{selectedRep.location.address}</p>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">
                      LAT: {selectedRep.location.lat.toFixed(6)}, LNG: {selectedRep.location.lng.toFixed(6)}
                    </div>
                  </div>
                </div>

                {/* Date filed */}
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between pt-1">
                  <span>Filed At:</span>
                  <span className="font-mono text-gray-500">{new Date(selectedRep.createdAt).toLocaleString()}</span>
                </div>

                {/* Admin Management Actions */}
                <div className="space-y-3 pt-3 border-t border-[#E5E1D8]">
                  <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider block">Administrative State controls</span>
                  
                  {/* Status selection pills */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Update Status:</label>
                    <div className="grid grid-cols-4 gap-1">
                      {['New', 'In Progress', 'Resolved', 'Reopened'].map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedRep.id, st as any)}
                          disabled={isUpdating}
                          className={`py-1.5 px-0.5 text-[10px] font-bold rounded-lg border transition-all truncate text-center cursor-pointer ${
                            selectedRep.status === st
                              ? 'bg-[#4B5E40] border-[#4B5E40] text-white shadow-sm font-extrabold'
                              : 'bg-white border-[#E5E1D8] text-slate-600 hover:border-[#BFB9AA]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority toggles */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Severity Priority Check:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Low', 'Medium', 'High'].map(pr => (
                        <button
                          key={pr}
                          onClick={() => handleUpdatePriority(selectedRep.id, pr as any)}
                          disabled={isUpdating}
                          className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border transition-all text-center cursor-pointer ${
                            selectedRep.priority === pr
                              ? pr === 'High' 
                                ? 'bg-rose-600 border-rose-600 text-white font-bold' 
                                : pr === 'Medium' 
                                  ? 'bg-amber-500 border-amber-500 text-white font-bold' 
                                  : 'bg-slate-700 border-slate-700 text-white font-bold'
                              : 'bg-white border-[#E5E1D8] text-slate-600 hover:border-[#BFB9AA]'
                          }`}
                        >
                          {pr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Danger delete actions */}
                  <button
                    onClick={() => handleDeleteReport(selectedRep.id)}
                    className="w-full mt-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold rounded-xl text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5" />
                    Delete Issue Record
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Full-width Map visual representation of all filters */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E1D8] shadow-sm space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 font-sans flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#4B5E40]" />
          Active Incident Visual Map ({filteredReports.length} points plotted)
        </h3>
        <p className="text-xs text-gray-400 max-w-xl font-sans leading-relaxed">
          The map displays filtered markers below. Click on any marker pin to open its administrative stats panel details inside the inspector column above.
        </p>
        <div className="h-[350px] sm:h-[450px]">
          <MapView
            reports={filteredReports}
            center={filteredReports.length > 0 ? [filteredReports[0].location.lat, filteredReports[0].location.lng] : [37.7749, -122.4194]}
          />
        </div>
      </div>
    </div>
  );
}
