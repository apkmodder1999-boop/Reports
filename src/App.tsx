import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ReportSubmissionForm } from './components/ReportSubmissionForm';
import { AdminDashboard } from './components/AdminDashboard';
import { Report, ReportStatus } from './types';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('submit');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiHealthy, setApiHealthy] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial reports
  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setApiHealthy(true);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setApiHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // When a report is created by the user
  const handleReportCreated = async (newReport: Report) => {
    setReports((prev) => [newReport, ...prev]);
    showToast(`Report ${newReport.ticketNumber} registered in Admin Queue!`, 'success');
  };

  const handleUpdateReportStatus = async (id: string, newStatus: ReportStatus) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === id ? data.report : r));
        showToast(`Report status updated to "${newStatus.replace('_', ' ')}"`, 'success');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Failed to update report status', 'error');
    }
  };

  const handleAddAdminNote = async (reportId: string, noteText: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const newNote = {
      id: 'note-' + Date.now(),
      author: 'Admin Reviewer',
      text: noteText,
      timestamp: new Date().toISOString()
    };

    const updatedNotes = [...(report.adminNotes || []), newNote];

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: updatedNotes })
      });
      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === reportId ? data.report : r));
        showToast('Admin note saved to ticket.', 'success');
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast('Failed to save note', 'error');
    }
  };

  const handleDeleteReport = async (id: string) => {
    // Optimistically update UI state immediately
    setReports(prev => prev.filter(r => r.id !== id));
    showToast('Report deleted successfully.', 'info');

    try {
      await fetch(`/api/reports/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Backend sync on delete notice:', err);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2">
          <div className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingReportsCount={pendingCount}
        apiHealthy={apiHealthy}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'submit' && (
          <ReportSubmissionForm
            onReportCreated={handleReportCreated}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            reports={reports}
            onUpdateReportStatus={handleUpdateReportStatus}
            onAddAdminNote={handleAddAdminNote}
            onDeleteReport={handleDeleteReport}
            onRefreshReports={fetchReports}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Report Hub • Screenshots, Voice Notes & Issue Triage</span>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <button onClick={() => setActiveTab('submit')} className="hover:text-indigo-400 transition-colors">
              Submit Issue
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('admin')} className="hover:text-indigo-400 transition-colors">
              Tickets Hub ({pendingCount} pending)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
