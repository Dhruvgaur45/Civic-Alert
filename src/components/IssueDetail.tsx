import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, MapPin, User, Clock, Send, Share2, 
  ThumbsUp, CheckCircle, MessageSquare, AlertTriangle, 
  Sparkles, ExternalLink, RefreshCw 
} from 'lucide-react';
import MapView from './MapView';
import type { CivicReport, ViewType } from '../types';

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  role?: string;
}

interface IssueDetailProps {
  reportId: string | null;
  onBack: (view: ViewType) => void;
  reports: CivicReport[];
  onRefresh: () => void;
}

export default function IssueDetail({ reportId, onBack, reports, onRefresh }: IssueDetailProps) {
  const [report, setReport] = useState<CivicReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for interactive features
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load report and interactive attributes
  useEffect(() => {
    if (!reportId) {
      setError('No report selected');
      return;
    }

    const fetchReportDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        } else {
          // Fallback to local array find if server has not saved yet
          const localMatch = reports.find(r => r.id === reportId);
          if (localMatch) {
            setReport(localMatch);
          } else {
            setError('The requested complaint could not be retrieved.');
          }
        }
      } catch (e) {
        console.error('Failed to load report detail:', e);
        const localMatch = reports.find(r => r.id === reportId);
        if (localMatch) {
          setReport(localMatch);
        } else {
          setError('Network issue or incident not found.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportDetail();

    // Load local comments & upvotes from localStorage
    const savedCommentsJson = localStorage.getItem(`comments_${reportId}`);
    if (savedCommentsJson) {
      setComments(JSON.parse(savedCommentsJson));
    } else {
      // Default placeholder comments depending on issue type
      const defaultNotes: Comment[] = [
        {
          id: 'c1',
          author: 'District Supervisor',
          text: 'Thank you for reporting this issue. We have logged it into the municipality tracking queue.',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          role: 'Official Representative'
        },
        {
          id: 'c2',
          author: 'Block Captain',
          text: 'Verified this is causing severe delays near our lane. Supporting the dispatch request.',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          role: 'Community Lead'
        }
      ];
      setComments(defaultNotes);
      localStorage.setItem(`comments_${reportId}`, JSON.stringify(defaultNotes));
    }

    const savedUpvotes = localStorage.getItem(`upvotes_${reportId}`);
    if (savedUpvotes) {
      setUpvotes(parseInt(savedUpvotes, 10));
    } else {
      // Randomized initial votes for visual excitement
      const initialInt = Math.floor(Math.random() * 8) + 2;
      setUpvotes(initialInt);
      localStorage.setItem(`upvotes_${reportId}`, initialInt.toString());
    }

    const savedHasUpvoted = localStorage.getItem(`voted_${reportId}`);
    if (savedHasUpvoted) {
      setHasUpvoted(true);
    } else {
      setHasUpvoted(false);
    }
  }, [reportId, reports]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !reportId) return;

    const authorName = commentAuthor.trim() || 'Civic Neighbor';
    const newAddition: Comment = {
      id: 'comment_' + Date.now(),
      author: authorName,
      text: newComment.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [...comments, newAddition];
    setComments(updated);
    localStorage.setItem(`comments_${reportId}`, JSON.stringify(updated));
    setNewComment('');
    // Store current author for next posts in session
    setCommentAuthor(authorName);
  };

  const handleUpvote = () => {
    if (!reportId) return;
    
    if (hasUpvoted) {
      const revisedVal = Math.max(0, upvotes - 1);
      setUpvotes(revisedVal);
      setHasUpvoted(false);
      localStorage.setItem(`upvotes_${reportId}`, revisedVal.toString());
      localStorage.removeItem(`voted_${reportId}`);
    } else {
      const revisedVal = upvotes + 1;
      setUpvotes(revisedVal);
      setHasUpvoted(true);
      localStorage.setItem(`upvotes_${reportId}`, revisedVal.toString());
      localStorage.setItem(`voted_${reportId}`, 'true');
    }
  };

  const handleCopyLink = () => {
    const absoluteUrl = `${window.location.origin}/report/${reportId}`;
    navigator.clipboard.writeText(absoluteUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 max-w-lg mx-auto">
        <RefreshCw className="w-8 h-8 text-[#4B5E40] animate-spin" />
        <p className="text-sm text-gray-500 font-sans">Retrieving current ticket properties...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto py-12 text-center bg-white border border-[#E5E1D8] rounded-2xl p-6 shadow-sm space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-[#2D2D2A]">Ticket Not Found</h3>
        <p className="text-xs text-gray-500 font-sans">
          {error || "The complaint you are attempting to review doesn't exist or is currently caching."}
        </p>
        <button 
          onClick={() => onBack('home')}
          className="px-4 py-2 bg-[#4B5E40] hover:bg-[#3D4F33] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  // Generate localized priority styles
  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'High': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-green-200';
      case 'In Progress': return 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';
      case 'Reopened': return 'bg-[#ECF3E9] text-[#4B5E40] border-[#D1E1CB]';
      default: return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Navigate Back Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => onBack('home')}
          className="group inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#4B5E40] font-sans transition-all cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-[#E5E1D8] shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Overview
        </button>

        <div className="text-[11px] text-gray-400 font-mono">
          REF: <span className="text-[#2D2D2A] font-bold">{report.id}</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Core content, photo, timeline & comments */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Card Header */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E1D8] shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400">Civic Ticket Category</span>
                <h1 className="text-2xl font-display font-bold text-[#2D2D2A] leading-tight">
                  {report.category}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${getPriorityStyle(report.priority)}`}>
                  Priority: {report.priority}
                </span>

                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${getStatusStyle(report.status)}`}>
                  {report.status}
                </span>
              </div>
            </div>

            {/* Timetable filed */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-sans border-b border-[#E5E1D8]/40 pb-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Filed: {new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Time: {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {report.isRepeated && (
                <div className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Repeated Dispute Spot ({report.repeatedCount}x files)</span>
                </div>
              )}
            </div>

            {/* Incident Description */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Citizen Problem statement</span>
              <p className="text-sm text-slate-700 leading-relaxed font-sans bg-[#FDFCF9] p-4 rounded-2xl border border-[#E5E1D8]/60">
                {report.description}
              </p>
            </div>

            {/* Upvote & Action row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                onClick={handleUpvote}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  hasUpvoted
                    ? 'bg-[#ECF3E9] border-[#D1E1CB] text-[#4B5E40] shadow-inner'
                    : 'bg-[#FDFCF9] border-[#E5E1D8] text-gray-600 hover:border-[#BFB9AA] hover:bg-slate-50'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-[#4B5E40] text-[#4B5E40]' : 'text-gray-400'}`} />
                <span>{hasUpvoted ? 'Urgency Logged' : 'Verify Urgent'} • {upvotes}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 bg-[#FDFCF9] hover:bg-slate-100 border border-[#E5E1D8] rounded-xl text-gray-600 font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy permanent share token link"
                >
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <span>{copySuccess ? 'Copied Link!' : 'Share'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Attached Photo Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E1D8] shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#2D2D2A] font-display flex items-center gap-1.5">
              📸 Citizen Attached Evidence
            </h3>
            
            {report.image ? (
              <div className="rounded-2xl overflow-hidden border border-[#E5E1D8] max-h-[400px] shadow-sm">
                <img 
                  src={report.image} 
                  alt={`${report.category} filed evidence`} 
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E1D8] bg-[#FDFCF9] rounded-2xl p-8 text-center text-xs text-gray-400 font-sans space-y-1">
                <p>No photo attachments were submitted for this dispute.</p>
                <p className="text-[10px] text-gray-300">Images are optional but enhance tracking diagnostics.</p>
              </div>
            )}
          </div>

          {/* Interactive Comments / Commmunity Board */}
          <div className="bg-white rounded-3xl p-6 border border-[#E5E1D8] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#2D2D2A] border-b border-[#E5E1D8] pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4B5E40]" />
              Interactive Community Board & Log ({comments.length})
            </h3>

            {/* Comment logs */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3.5 bg-[#FDFCF9] rounded-2xl border border-[#E5E1D8] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#2D2D2A]">{comment.author}</span>
                      {comment.role && (
                        <span className="bg-[#ECF3E9] text-[#4B5E40] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#D1E1CB]">
                          {comment.role}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 font-mono text-[9px]">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>

            {/* New comment formulation */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-[#E5E1D8]/60 space-y-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Submit local comment or status advice</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Your Name (Optional)"
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E1D8] text-xs outline-none focus:border-[#4B5E40] text-[#2D2D2A]"
                  />
                </div>
                <div className="sm:col-span-8 flex gap-2">
                  <input
                    type="text"
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type comments or official update logs..."
                    maxLength={200}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#E5E1D8] text-xs outline-none focus:border-[#4B5E40] text-[#2D2D2A]"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-[#4B5E40] hover:bg-[#3D4F33] text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>

          </div>

        </div>

        {/* Right Column: Location Map & QR Code Sharing */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Map Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#E5E1D8] shadow-sm space-y-4">
            
            <div className="border-b border-[#E5E1D8] pb-3">
              <h3 className="font-semibold text-[#2D2D2A] flex items-center gap-1.5 text-sm md:text-base font-display">
                <MapPin className="w-4 h-4 text-[#4B5E40]" />
                Location Verification
              </h3>
              <p className="text-[11px] text-gray-500 font-sans mt-0.5">Physical location pinned securely on open coordinates</p>
            </div>

            {/* Human details coordinates text */}
            <div className="p-3.5 bg-[#FDFCF9] border border-[#E5E1D8] rounded-2xl flex flex-col gap-1 text-xs">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Matched GPS Street Address</span>
              <p className="text-[#2D2D2A] leading-relaxed font-sans font-semibold">📍 {report.location.address}</p>
              
              <div className="mt-2 pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Latitude: {report.location.lat.toFixed(6)}</span>
                <span>Longitude: {report.location.lng.toFixed(6)}</span>
              </div>
            </div>

            {/* Embedded leaf map */}
            <div className="h-[300px] overflow-hidden rounded-2xl border border-[#E5E1D8]">
              <MapView 
                reports={[report]} 
                center={[report.location.lat, report.location.lng]}
                selectedLocation={{ lat: report.location.lat, lng: report.location.lng }}
              />
            </div>

          </div>

          {/* Quick Informational / Action Guide Widget */}
          <div className="bg-[#2D2D2A] text-[#F7F5F0] rounded-3xl p-6 border border-stone-800 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-[#88B378]" />
              Civic Alert Protocol
            </h3>
            
            <ul className="text-xs text-stone-200 space-y-3 font-sans leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#88B378] font-bold">1.</span>
                <span className="font-sans">This concern is logged as a public ledger record. Everyone connected in 500m gets local chime audio waves when it's updated.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#88B378] font-bold">2.</span>
                <span className="font-sans">Admin moderators inspect comments and flag hotspot frequency to determine high severity escalations.</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-[10px] text-gray-400">
              <span>Status Ledger: Verified</span>
              <button 
                onClick={() => window.open(`https://maps.google.com/?q=${report.location.lat},${report.location.lng}`, '_blank')}
                className="text-xs text-[#88B378] hover:underline flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
              >
                Google Maps <ExternalLink className="w-3" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
