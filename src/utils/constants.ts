import { DeviceInfo } from '../types';

export function getClientDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      screenResolution: 'N/A',
      userAgent: 'N/A',
      pageUrl: 'N/A',
      language: 'en'
    };
  }

  const userAgent = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect Browser
  if (userAgent.includes('Firefox')) {
    browser = 'Mozilla Firefox';
  } else if (userAgent.includes('SamsungBrowser')) {
    browser = 'Samsung Internet';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  } else if (userAgent.includes('Trident')) {
    browser = 'Internet Explorer';
  } else if (userAgent.includes('Edge') || userAgent.includes('Edg')) {
    browser = 'Microsoft Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Google Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Apple Safari';
  }

  // Detect OS
  if (userAgent.includes('Win')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('X11') || userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    userAgent: userAgent.substring(0, 150),
    pageUrl: window.location.href,
    language: navigator.language || 'en-US'
  };
}

export const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  bug: { label: 'Bug / Crash', icon: 'Bug', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: 'Unexpected errors, broken features, or app crashes' },
  ui_glitch: { label: 'UI / Visual Glitch', icon: 'Sparkles', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: 'Misaligned elements, dark mode flaws, or rendering issues' },
  account_security: { label: 'Account & Security', icon: 'ShieldAlert', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: 'Login, 2FA, permissions, or security vulnerabilities' },
  performance: { label: 'Performance / Lag', icon: 'Gauge', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', desc: 'Slow response times, high memory, or frozen states' },
  billing: { label: 'Billing & Payments', icon: 'CreditCard', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: 'Subscription, invoice, gateway, or refund issues' },
  feature_request: { label: 'Feature Suggestion', icon: 'Lightbulb', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', desc: 'Ideas and enhancements for product roadmap' },
  other: { label: 'General / Other', icon: 'HelpCircle', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', desc: 'Any other feedback or inquiry' }
};

export const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  low: { label: 'Low', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  medium: { label: 'Medium', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  high: { label: 'High', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  critical: { label: 'Critical (Blocker)', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500 animate-pulse' }
};

export const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Pending Triage', bg: 'bg-slate-800 text-slate-300', text: 'text-slate-300', border: 'border-slate-700' },
  under_review: { label: 'Under Review', bg: 'bg-indigo-500/15 text-indigo-400', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-500/15 text-amber-400', text: 'text-amber-400', border: 'border-amber-500/30' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-500/15 text-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  dismissed: { label: 'Dismissed', bg: 'bg-slate-800/80 text-slate-500', text: 'text-slate-500', border: 'border-slate-800' }
};
