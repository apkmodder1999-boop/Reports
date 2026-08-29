import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  Play, 
  Pause, 
  Image as ImageIcon, 
  Volume2, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  ChevronRight, 
  X, 
  Send,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { Report, ReportStatus, ReportPriority, ReportCategory } from '../types';
import { CATEGORY_LABELS, PRIORITY_STYLES, STATUS_STYLES } from '../utils/constants';

interface AdminDashboardProps {
  reports: Report[];
  onUpdateReportStatus: (id: string, newStatus: ReportStatus) => Promise<void>;
  onAddAdminNote: (reportId: string, noteText: string) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onRefreshReports: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  reports,
  onUpdateReportStatus,
  onAddAdminNote,
  onDeleteReport,
  onRefreshReports
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [activeAudioObj, setActiveAudioObj] = useState<HTMLAudioElement | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    const matchesSearch = 
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.userName && rep.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rep.userEmail && rep.userEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || rep.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || rep.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'all' || rep.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Metrics
  const totalCount = reports.length;
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress' || r.status === 'under_review').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const criticalCount = reports.filter(r => r.priority === 'critical' || r.priority === 'high').length;

  const handleToggleAudio = (reportId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingAudioId === reportId) {
      activeAudioObj?.pause();
      setPlayingAudioId(null);
      setActiveAudioObj(null);
    } else {
      if (activeAudioObj) {
        activeAudioObj.pause();
      }
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingAudioId(null);
        setActiveAudioObj(null);
      };
      audio.play().catch(console.error);
      setActiveAudioObj(audio);
      setPlayingAudioId(reportId);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newNoteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      await onAddAdminNote(selectedReport.id, newNoteText.trim());
      // Update local drawer state
      const updatedNotes = [
        ...selectedReport.adminNotes,
        {
          id: 'note-' + Date.now(),
          author: 'Admin Reviewer',
          text: newNoteText.trim(),
          timestamp: new Date().toISOString()
        }
      ];
      setSelectedReport({
        ...selectedReport,
        adminNotes: updatedNotes
      });
      setNewNoteText('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshReports();
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Ticket', 'Title', 'Category', 'Priority', 'Status', 'Reporter Email', 'Created At'];
    const rows = filteredReports.map(r => [
      r.ticketNumber,
      `"${r.title.replace(/"/g, '""')}"`,
      r.category,
      r.priority,
      r.status,
      r.userEmail || 'N/A',
      r.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reports_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredReports, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `reports_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-dashboard-view" className="space-y-6">
      {/* Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Admin Issue Management Hub</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-normal">
              {totalCount} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review incoming screenshots, listen to voice recordings, update status workflows, and collaborate on resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-refresh-reports"
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              id="btn-export-csv"
              onClick={exportCSV}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              type="button"
              id="btn-export-json"
              onClick={exportJSON}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Reports</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Triage</div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{pendingCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">In Progress</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">{inProgressCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Resolved</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{resolvedCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Critical / High</div>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{criticalCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="admin-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, description, ticket ID, or user..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            >
              <option value="all">All Categories</option>
              {Object.keys(CATEGORY_LABELS).map((cKey) => (
                <option key={cKey} value={cKey}>{CATEGORY_LABELS[cKey].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List / Table */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center border border-slate-800/80 rounded-2xl bg-slate-900/20 space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">No reports match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or submit a new test report from the submission tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const pStyle = PRIORITY_STYLES[report.priority] || PRIORITY_STYLES.medium;
            const sStyle = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
            const catLabel = CATEGORY_LABELS[report.category]?.label || report.category;
            const hasVoice = !!report.voiceNote;
            const hasImage = !!report.screenshot;
            const isPlaying = playingAudioId === report.id;

            return (
              <div
                key={report.id}
                id={`report-card-${report.id}`}
                className={`p-4 rounded-xl border transition-all bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700 space-y-3 ${
                  report.priority === 'critical' ? 'border-l-4 border-l-rose-500' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {/* Status Dropdown */}
                    <select
                      value={report.status}
                      onChange={(e) => onUpdateReportStatus(report.id, e.target.value as ReportStatus)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${sStyle.bg} ${sStyle.border}`}
                    >
                      <option value="pending" className="bg-slate-900 text-slate-200">Pending</option>
                      <option value="under_review" className="bg-slate-900 text-slate-200">Under Review</option>
                      <option value="in_progress" className="bg-slate-900 text-slate-200">In Progress</option>
                      <option value="resolved" className="bg-slate-900 text-slate-200">Resolved</option>
                      <option value="dismissed" className="bg-slate-900 text-slate-200">Dismissed</option>
                    </select>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {report.ticketNumber}
                        </span>
                        <h4 
                          onClick={() => setSelectedReport(report)}
                          className="text-sm font-semibold text-slate-100 hover:text-indigo-300 cursor-pointer transition-colors"
                        >
                          {report.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                          {report.priority.toUpperCase()}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>{catLabel}</span>
                        <span className="text-slate-500">•</span>
                        <span>{new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(report.createdAt).toLocaleDateString()}</span>
                        {report.userName && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-300">by {report.userName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Attachment Badges */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* Voice Note Quick Play */}
                    {hasVoice && (
                      <button
                        type="button"
                        id={`btn-play-audio-${report.id}`}
                        onClick={() => handleToggleAudio(report.id, report.voiceNote?.dataUrl)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isPlaying
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{report.voiceNote?.durationSeconds}s</span>
                      </button>
                    )}

                    {/* Screenshot Badge */}
                    {hasImage && (
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Image</span>
                      </button>
                    )}

                    {/* View Details Drawer Button */}
                    <button
                      type="button"
                      id={`btn-review-${report.id}`}
                      onClick={() => setSelectedReport(report)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors font-medium cursor-pointer"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Delete Card Button */}
                    {confirmDeleteId === report.id ? (
                      <div className="flex items-center gap-1 animate-in fade-in">
                        <button
                          type="button"
                          id={`btn-confirm-delete-${report.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(report.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow cursor-pointer"
                          title="Click to permanently delete ticket"
                        >
                          Delete?
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`btn-delete-card-${report.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(report.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/40 text-xs transition-colors cursor-pointer"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Excerpt */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>

                {/* Voice Transcript excerpt if present */}
                {report.voiceNote?.transcription && (
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 italic flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">"{report.voiceNote.transcription}"</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Side Drawer / Modal for Selected Report */}
      {selectedReport && (
        <div 
          id="report-detail-drawer-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                    {selectedReport.ticketNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    Created {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-2">
                  {selectedReport.title}
                </h3>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Priority Controller */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workflow Status</label>
                <select
                  value={selectedReport.status}
                  onChange={(e) => {
                    const next = e.target.value as ReportStatus;
                    onUpdateReportStatus(selectedReport.id, next);
                    setSelectedReport({ ...selectedReport, status: next });
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none"
                >
                  <option value="pending">Pending Triage</option>
                  <option value="under_review">Under Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Severity</label>
                <div className="mt-1.5 text-xs font-bold capitalize text-slate-300 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[selectedReport.priority]?.dot || 'bg-slate-400'}`} />
                  {selectedReport.priority} ({selectedReport.category})
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedReport.description || "No text description provided."}
              </div>
            </div>

            {/* Reproduction Steps if provided */}
            {selectedReport.stepsToReproduce && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Steps to Reproduce</h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                  {selectedReport.stepsToReproduce}
                </div>
              </div>
            )}

            {/* Attached Screenshot Viewer */}
            {selectedReport.screenshot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Attached Screenshot
                  </h4>
                  <a
                    href={selectedReport.screenshot.dataUrl}
                    download={selectedReport.screenshot.filename}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 text-center">
                  <img
                    src={selectedReport.screenshot.dataUrl}
                    alt="Report attachment"
                    className="max-h-72 object-contain mx-auto rounded-lg"
                  />
                  <div className="mt-2 text-[11px] text-slate-500 font-mono">
                    {selectedReport.screenshot.filename} ({(selectedReport.screenshot.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
              </div>
            )}

            {/* Attached Voice Note Audio Player */}
            {selectedReport.voiceNote && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Voice Recording ({selectedReport.voiceNote.durationSeconds}s)
                </h4>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAudio(selectedReport.id, selectedReport.voiceNote?.dataUrl)}
                      className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shrink-0"
                    >
                      {playingAudioId === selectedReport.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {playingAudioId === selectedReport.id ? 'Playing Voice Note...' : 'Click to Play Audio'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {selectedReport.voiceNote.filename} • {selectedReport.voiceNote.durationSeconds} seconds
                      </div>
                    </div>
                  </div>

                  {selectedReport.voiceNote.transcription && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 italic">
                      <span className="font-semibold text-indigo-400 not-italic block mb-1">Transcription:</span>
                      "{selectedReport.voiceNote.transcription}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Triage Analysis Block */}
            {selectedReport.aiTriage && (
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Automated Triage & Recommendation
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {selectedReport.aiTriage.summary}
                </p>
                <div className="text-xs text-indigo-200/90 font-mono bg-indigo-900/30 p-2.5 rounded-lg border border-indigo-500/20">
                  <span className="font-bold text-indigo-400">Suggested Action: </span>
                  {selectedReport.aiTriage.suggestedAction}
                </div>
                {selectedReport.aiTriage.keyFactors?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedReport.aiTriage.keyFactors.map((kf, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        {kf}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reporter & Diagnostics */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Reporter & Device Diagnostics</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-1">
                <div><span className="text-slate-500">Name:</span> {selectedReport.userName || 'Anonymous'}</div>
                <div><span className="text-slate-500">Email:</span> {selectedReport.userEmail || 'N/A'}</div>
                <div><span className="text-slate-500">Browser:</span> {selectedReport.deviceInfo?.browser}</div>
                <div><span className="text-slate-500">OS:</span> {selectedReport.deviceInfo?.os}</div>
                <div><span className="text-slate-500">Resolution:</span> {selectedReport.deviceInfo?.screenResolution}</div>
                <div><span className="text-slate-500">Language:</span> {selectedReport.deviceInfo?.language}</div>
              </div>
            </div>

            {/* Admin Notes Section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Internal Team Notes ({selectedReport.adminNotes?.length || 0})
              </h4>

              {selectedReport.adminNotes && selectedReport.adminNotes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedReport.adminNotes.map((note) => (
                    <div key={note.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">{note.author}</span>
                        <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-200">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add an internal triage note..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newNoteText.trim() || isSubmittingNote}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Delete Report */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              {confirmDeleteId === selectedReport.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-confirm-delete-drawer"
                    onClick={() => {
                      const id = selectedReport.id;
                      setSelectedReport(null);
                      setConfirmDeleteId(null);
                      onDeleteReport(id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Permanent Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-delete-report"
                  onClick={() => setConfirmDeleteId(selectedReport.id)}
                  className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/60 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Ticket
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setSelectedReport(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
