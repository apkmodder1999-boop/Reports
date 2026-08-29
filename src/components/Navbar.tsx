import React from 'react';
import { 
  FileText, 
  Layers, 
  Bot, 
  Lightbulb, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export type ActiveTab = 'submit' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingReportsCount: number;
  apiHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  pendingReportsCount,
  apiHealthy
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onTabChange('submit')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight">
                Report Hub
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Screenshots • Voice Notes • Admin Triage Management
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            id="tab-submit-report"
            onClick={() => onTabChange('submit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Submit Issue</span>
          </button>

          <button
            type="button"
            id="tab-admin-dashboard"
            onClick={() => onTabChange('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tickets Hub</span>
            {pendingReportsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingReportsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${apiHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-400 text-[11px] font-mono">
            {apiHealthy ? 'Database Active' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
};
