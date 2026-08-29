import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Paperclip, 
  Image as ImageIcon, 
  X, 
  ZoomIn, 
  User, 
  Mail, 
  Layers, 
  Clock, 
  HelpCircle,
  Bug,
  Lightbulb,
  Zap,
  Palette,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WhatsAppVoiceRecorder } from './WhatsAppVoiceRecorder';
import { 
  Report, 
  ReportCategory, 
  ReportPriority, 
  MediaAttachment, 
  VoiceNoteAttachment, 
  DeviceInfo 
} from '../types';
import { getClientDeviceInfo } from '../utils/constants';

interface ReportSubmissionFormProps {
  onReportCreated: (newReport: Report) => void;
  onNavigateToAdmin: () => void;
}

const QUICK_TAGS: { id: ReportCategory; label: string; icon: any; color: string }[] = [
  { id: 'bug', label: 'Bug / Crash', icon: Bug, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { id: 'ui_glitch', label: 'UI Glitch', icon: Palette, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'performance', label: 'Lag / Speed', icon: Zap, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'feature_request', label: 'Idea', icon: Lightbulb, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'text-slate-400 border-slate-700 bg-slate-800/60' }
];

export const ReportSubmissionForm: React.FC<ReportSubmissionFormProps> = ({
  onReportCreated,
  onNavigateToAdmin
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('bug');
  const [priority, setPriority] = useState<ReportPriority>('medium');
  const [userName, setUserName] = useState(() => localStorage.getItem('rh_reporter_name') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('rh_reporter_email') || '');
  const [showUserDetails, setShowUserDetails] = useState(false);

  const [screenshot, setScreenshot] = useState<MediaAttachment | undefined>(undefined);
  const [voiceNote, setVoiceNote] = useState<VoiceNoteAttachment | undefined>(undefined);
  const [isZoomedScreenshot, setIsZoomedScreenshot] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize browser environment info
  useEffect(() => {
    setDeviceInfo(getClientDeviceInfo());
  }, []);

  // Global Ctrl+V clipboard image paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processScreenshotFile(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processScreenshotFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('Screenshot exceeds 15MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot({
        dataUrl: event.target?.result as string,
        filename: file.name || `screenshot_${Date.now()}.png`,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processScreenshotFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const finalTitle = title.trim() || (
      voiceNote ? `Voice Note Report (${voiceNote.durationSeconds}s)` :
      screenshot ? `Visual Issue from ${screenshot.filename}` :
      description.slice(0, 50) || 'Quick Issue Report'
    );

    if (!description.trim() && !voiceNote && !screenshot) {
      alert('Please provide some information: record a voice note, write a description, or attach a screenshot.');
      return;
    }

    setIsSubmitting(true);

    // Save reporter info in localStorage for future convenience
    if (userName) localStorage.setItem('rh_reporter_name', userName);
    if (userEmail) localStorage.setItem('rh_reporter_email', userEmail);

    try {
      // Auto-determine priority
      let autoPriority: ReportPriority = priority;
      const lower = `${finalTitle} ${description}`.toLowerCase();
      if (lower.includes('crash') || lower.includes('blocker') || lower.includes('critical') || lower.includes('broken')) {
        autoPriority = 'high';
      }

      // Server AI Triage
      let aiTriageData = undefined;
      try {
        const triageRes = await fetch('/api/gemini/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: finalTitle,
            description: description || (voiceNote ? 'Voice note recorded by user' : 'Screenshot attached'),
            category,
            priority: autoPriority,
            hasVoice: !!voiceNote,
            hasScreenshot: !!screenshot
          })
        });
        if (triageRes.ok) {
          const data = await triageRes.json();
          aiTriageData = data.triage;
        }
      } catch (triageErr) {
        console.warn('AI Triage fallback:', triageErr);
      }

      const payload = {
        title: finalTitle,
        description: description.trim() || (voiceNote ? 'Voice note attached' : 'Visual issue reported'),
        category,
        priority: autoPriority,
        userName: userName.trim() || 'Anonymous User',
        userEmail: userEmail.trim() || undefined,
        deviceInfo: deviceInfo || getClientDeviceInfo(),
        screenshot,
        voiceNote,
        aiTriage: aiTriageData,
        tags: [category, autoPriority, screenshot ? 'has-screenshot' : '', voiceNote ? 'has-voice' : ''].filter(Boolean)
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to record report on server');
      }

      const resData = await res.json();
      const newReport: Report = resData.report;

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}

      onReportCreated(newReport);
      setSubmittedReport(newReport);

      // Reset form
      setTitle('');
      setDescription('');
      setScreenshot(undefined);
      setVoiceNote(undefined);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(`Could not submit report: ${err.message || 'Please check your connection.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDraftContent = !!(title.trim() || description.trim() || voiceNote || screenshot);

  return (
    <div id="report-submission-view" className="max-w-3xl mx-auto space-y-4">
      {/* Messenger Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                Issue & Voice Desk
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                WhatsApp Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Speak via built-in mic, drop a screenshot, or type your message
            </p>
          </div>
        </div>

        {/* Reporter Info Quick Toggle */}
        <button
          type="button"
          id="btn-toggle-reporter-info"
          onClick={() => setShowUserDetails(!showUserDetails)}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
        >
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">
            {userName ? userName : 'Reporter'}
          </span>
          {showUserDetails ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
        </button>
      </div>

      {/* Expandable Reporter Details */}
      {showUserDetails && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-400" /> Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Sarah Connor"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-emerald-400" /> Your Email
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="e.g. sarah@example.com"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Main Interactive Chat Flow Area */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border bg-slate-950/80 p-4 sm:p-5 space-y-4 transition-all duration-200 ${
          isDraggingFile
            ? 'border-emerald-400 bg-emerald-950/20 scale-[0.99]'
            : 'border-slate-800 shadow-2xl'
        }`}
      >
        {/* System Greeting Bubble */}
        <div className="flex items-start gap-2.5 max-w-lg">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="p-3 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed shadow-sm">
            <p className="font-semibold text-slate-100 mb-1">
              👋 What issue or glitch did you encounter?
            </p>
            <p className="text-slate-400">
              Tap the green microphone below to record a voice message, drop a screenshot, or type your message.
            </p>
          </div>
        </div>

        {/* Live Draft Message Bubble (Messenger Preview) */}
        {hasDraftContent && (
          <div className="flex flex-col items-end gap-2 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono flex items-center gap-1 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Draft Preview
            </span>

            <div className="max-w-xl w-full sm:w-auto p-4 rounded-2xl rounded-tr-sm bg-emerald-950/40 border border-emerald-500/30 space-y-3 shadow-lg">
              {/* Draft Title */}
              {title.trim() && (
                <div className="font-bold text-sm text-emerald-200 border-b border-emerald-500/20 pb-1.5">
                  {title}
                </div>
              )}

              {/* Draft Text */}
              {description.trim() && (
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {description}
                </p>
              )}

              {/* Attached Screenshot Card in Bubble */}
              {screenshot && (
                <div className="relative group rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900/90 p-2">
                  <div className="relative rounded-lg overflow-hidden max-h-48 flex items-center justify-center bg-black/40">
                    <img
                      src={screenshot.dataUrl}
                      alt="Screenshot attachment"
                      className="max-h-48 object-contain rounded cursor-pointer"
                      onClick={() => setIsZoomedScreenshot(true)}
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsZoomedScreenshot(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 hover:text-white text-[11px] flex items-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> Full Size
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreenshot(undefined)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white text-[11px] flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1.5 px-1">
                    <span className="truncate max-w-[200px]">{screenshot.filename}</span>
                    <span>{(screenshot.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              )}

              {/* Metadata pill */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-emerald-400/80 font-mono">
                <span className="capitalize">Category: {category}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Ready to submit
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Built-in Voice Note Recording Widget */}
        <div className="pt-2">
          <WhatsAppVoiceRecorder
            voiceNote={voiceNote}
            onVoiceNoteChange={setVoiceNote}
          />
        </div>

        {/* Quick 1-Tap Category Pills */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tag category (optional):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const Icon = tag.icon;
              const isSelected = category === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setCategory(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? `${tag.color} ring-1 ring-emerald-400/50 shadow-sm`
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp-Style Modern Composer Bar */}
        <div className="pt-2">
          <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-lg">
            {/* Quick Title input (optional/inline) */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title / summary (e.g. Login button broken)..."
              className="w-full px-2 py-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs font-medium outline-none border-b border-slate-800/80 focus:border-emerald-500/50"
            />

            {/* Main message textarea */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmit();
                }
              }}
              placeholder="Type issue details or explanation (Ctrl+Enter to send)..."
              className="w-full px-2 py-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm outline-none resize-none leading-relaxed"
            />

            {/* Bottom Actions Bar inside Composer */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              {/* Left Actions: Attach File / Screenshot & Paste notice */}
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processScreenshotFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="composer-file-upload"
                />
                <button
                  type="button"
                  id="btn-attach-screenshot"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    screenshot 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Attach screenshot or photo (or paste with Ctrl+V)"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {screenshot ? 'Photo Attached' : 'Attach Photo'}
                  </span>
                </button>

                <span className="text-[10px] text-slate-500 hidden md:inline px-1">
                  Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">Ctrl+V</kbd> to paste images
                </span>
              </div>

              {/* Right Action: Send Button */}
              <button
                type="button"
                id="btn-submit-report-whatsapp"
                disabled={isSubmitting || (!description.trim() && !voiceNote && !screenshot && !title.trim())}
                onClick={() => handleSubmit()}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isSubmitting || (!description.trim() && !voiceNote && !screenshot && !title.trim())
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Send Report</span>
                    <Send className="w-3.5 h-3.5 fill-current" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoomed Screenshot Lightbox Modal */}
      {isZoomedScreenshot && screenshot && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomedScreenshot(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsZoomedScreenshot(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-slate-200 hover:text-white hover:bg-rose-500 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={screenshot.dataUrl}
              alt="Zoomed screenshot"
              className="max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Success Modal after Submission */}
      {submittedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100">
                Report Submitted Successfully!
              </h3>
              <p className="text-xs text-slate-400">
                Your report has been assigned ticket{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {submittedReport.ticketNumber}
                </span>{' '}
                and queued for immediate review.
              </p>
            </div>

            {/* Quick Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-semibold text-slate-100 truncate max-w-[240px]">
                  {submittedReport.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                  {submittedReport.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {submittedReport.voiceNote && (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    🎙️ {submittedReport.voiceNote.durationSeconds}s Voice Note
                  </span>
                )}
                {submittedReport.screenshot && (
                  <span className="text-indigo-300 flex items-center gap-1">
                    📷 Screenshot Attached
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-modal-open-tickets-queue"
                onClick={() => {
                  setSubmittedReport(null);
                  onNavigateToAdmin();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                View All Tickets
              </button>
              <button
                type="button"
                id="btn-modal-submit-another"
                onClick={() => setSubmittedReport(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Submit Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
