export type ReportCategory = 
  | 'bug' 
  | 'ui_glitch' 
  | 'account_security' 
  | 'performance' 
  | 'billing' 
  | 'feature_request' 
  | 'other';

export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 'pending' | 'under_review' | 'in_progress' | 'resolved' | 'dismissed';

export interface DeviceInfo {
  browser: string;
  os: string;
  screenResolution: string;
  userAgent: string;
  pageUrl: string;
  language: string;
}

export interface MediaAttachment {
  dataUrl: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface VoiceNoteAttachment {
  dataUrl: string;
  durationSeconds: number;
  mimeType: string;
  filename: string;
  recordedAt: string;
  transcription?: string;
}

export interface AITriageData {
  summary: string;
  estimatedSeverity: ReportPriority;
  suggestedAction: string;
  keyFactors: string[];
  sentiment: 'frustrated' | 'urgent' | 'neutral' | 'constructive';
}

export interface AdminNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Report {
  id: string;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  userEmail?: string;
  userName?: string;
  deviceInfo: DeviceInfo;
  screenshot?: MediaAttachment;
  voiceNote?: VoiceNoteAttachment;
  aiTriage?: AITriageData;
  adminNotes: AdminNote[];
  tags: string[];
}
