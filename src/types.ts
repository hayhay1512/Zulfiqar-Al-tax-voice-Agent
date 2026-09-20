export type MessageType = 'text' | 'voice';
export type SenderType = 'customer' | 'ai' | 'human';
export type ResponseMode = 'AUTO' | 'TEXT_ONLY' | 'VOICE_ONLY';
export type CustomerPreference = 'AUTO' | 'VOICE' | 'TEXT';
export type LanguageCode = 'urdu' | 'roman_urdu' | 'english' | 'mixed';
export type LeadStatus = 'Cold' | 'Warm' | 'Hot' | 'Qualified' | 'Converted';
export type VoicePersona = 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon';
export type SpeakingStyle = 'friendly' | 'sales' | 'concise';
export type ResponseLength = 'concise' | 'balanced' | 'detailed';

export interface VideoAdBrief {
  productName?: string;
  businessType?: string;
  videoDuration?: string; // e.g. "15s", "30s", "60s"
  targetPlatform?: string; // e.g. "TikTok", "Instagram", "Facebook", "YouTube"
  goal?: string; // e.g. "E-commerce sales", "Brand awareness", "Lead gen"
  budget?: string; // e.g. "$89" or "Rs. 25,000"
  hasRawFootage?: boolean;
  scriptNeeded?: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  preferredMode: CustomerPreference;
  detectedLanguage: LanguageCode;
  qualificationStatus: LeadStatus;
  notes: string;
  videoAdBrief: VideoAdBrief;
  tags: string[];
  lastActive: string;
}

export interface ChatMessage {
  id: string;
  sender: SenderType;
  type: MessageType;
  text: string;
  audioUrl?: string;
  durationSec?: number;
  detectedLanguage?: LanguageCode;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  transcription?: string;
  isVoiceFallback?: boolean;
}

export interface AdminConfig {
  responseMode: ResponseMode;
  voiceEnabled: boolean;
  defaultVoice: VoicePersona;
  languageMode: 'auto' | 'urdu' | 'roman_urdu' | 'english';
  speakingStyle: SpeakingStyle;
  responseLength: ResponseLength;
  voiceSpeed: number; // 0.8, 1.0, 1.2
  fallbackToTextOnVoiceFail: boolean;
  humanHandoverActive: boolean;
  adminAlerts: Array<{ id: string; time: string; text: string; type: 'info' | 'warning' | 'error' }>;
}

export interface ServicePackage {
  id: string;
  name: string;
  duration: string;
  usdPrice: number;
  pkrPrice: number;
  turnaround: string;
  description: string;
  features: string[];
}

export interface KnowledgeBase {
  companyName: string;
  coreService: string;
  packages: ServicePackage[];
  faqs: Array<{ id: string; question: string; answer: string; category: string }>;
  portfolioSamples: Array<{ title: string; duration: string; niche: string; platform: string; metric: string }>;
  revisionPolicy: string;
  turnaroundPolicy: string;
}

export interface PipelineStepLog {
  stepNumber: number;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';
  durationMs?: number;
  details?: Record<string, unknown> | string;
}

export interface ChatApiResponse {
  replyText: string;
  replyType: MessageType;
  replyAudioBase64?: string;
  replyAudioMimeType?: string;
  replyDurationSec?: number;
  detectedLanguage: LanguageCode;
  customerIntent: string;
  updatedProfile: CustomerProfile;
  pipelineLogs: PipelineStepLog[];
  switchedPreference?: CustomerPreference;
  fallbackUsed?: boolean;
  totalDurationMs?: number;
}
