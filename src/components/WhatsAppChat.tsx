import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Activity,
  Bot,
  Volume2,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Mic,
} from 'lucide-react';
import { ChatMessage, CustomerProfile, AdminConfig, LanguageCode, ResponseMode } from '../types';
import { AudioMessageBubble } from './AudioMessageBubble';
import { VoiceRecorder } from './VoiceRecorder';

interface WhatsAppChatProps {
  messages: ChatMessage[];
  customerProfile: CustomerProfile;
  adminConfig: AdminConfig;
  isProcessing: boolean;
  currentProcessingStep?: { step: number; name: string };
  onSendMessage: (params: {
    type: 'text' | 'voice';
    text?: string;
    audioBase64?: string;
    durationSec?: number;
    transcriptHint?: string;
  }) => void;
  onOpenPipelineInspector: () => void;
  detectedLanguage?: LanguageCode;
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  messages,
  customerProfile,
  adminConfig,
  isProcessing,
  currentProcessingStep,
  onSendMessage,
  onOpenPipelineInspector,
  detectedLanguage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;
    onSendMessage({
      type: 'text',
      text: trimmed,
    });
    setInputText('');
  };

  const handleSendVoiceNote = (
    audioBase64: string,
    mimeType: string,
    durationSec: number,
    transcriptHint?: string
  ) => {
    onSendMessage({
      type: 'voice',
      audioBase64,
      durationSec,
      text: transcriptHint || '',
      transcriptHint,
    });
  };

  const quickScenarios = [
    {
      label: '1. Text (Urdu Price Inquiry)',
      type: 'text' as const,
      text: 'آپ کی ویڈیو ایڈ کی قیمت کتنی ہے؟',
      desc: 'Customer sends text in Urdu',
    },
    {
      label: '2. Voice (Duration inquiry)',
      type: 'voice' as const,
      text: 'اچھا یہ بتائیں کتنے سیکنڈ کی ویڈیو بنے گی؟',
      duration: 5,
      desc: 'Customer sends voice note in Urdu',
    },
    {
      label: '3. Text ("اور price کیا ہوگی؟")',
      type: 'text' as const,
      text: 'اور price کیا ہوگی؟',
      desc: 'Customer switches back to text (memory preserved!)',
    },
    {
      label: '4. Preference: "Text mein reply karein"',
      type: 'text' as const,
      text: 'Text mein reply karein please, main meeting mein hoon.',
      desc: 'Switches agent response mode to text',
    },
    {
      label: '5. Preference: "Voice mein bhejein"',
      type: 'text' as const,
      text: 'Voice note mein detail samjha dein.',
      desc: 'Switches agent response mode to voice',
    },
    {
      label: '6. Roman Urdu Ad Brief',
      type: 'voice' as const,
      text: 'Mera clothing brand hai TikTok ke liye 30 second ki ad banwani hai.',
      duration: 6,
      desc: 'Roman Urdu voice message with brief',
    },
    {
      label: '7. English E-commerce inquiry',
      type: 'text' as const,
      text: 'Do you provide direct response video ads for Shopify dropshipping?',
      desc: 'English inquiry with automatic language switch',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#efeae2] rounded-xl shadow-lg border border-slate-300 overflow-hidden relative font-sans">
      {/* WhatsApp Header */}
      <div className="bg-[#008069] text-white px-3 py-2.5 sm:px-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Avatar with WhatsApp ring */}
          <div className="relative">
            <img
              src={customerProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={customerProfile.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-300/60"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#008069] rounded-full"></div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-sm sm:text-base leading-tight">
                {customerProfile.name}
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100 font-medium">
                {customerProfile.phone}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-100">
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3 text-emerald-300" />
                WhatsApp AI Agent
              </span>
              <span>&bull;</span>
              <span className="text-emerald-200">
                Mode:{' '}
                <strong className="text-white">
                  {adminConfig.responseMode}
                </strong>
              </span>
              {customerProfile.preferredMode !== 'AUTO' && (
                <>
                  <span>&bull;</span>
                  <span className="bg-emerald-800/80 px-1.5 py-0.2 rounded text-[10px] text-amber-200">
                    Pref: {customerProfile.preferredMode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Badges & Actions */}
        <div className="flex items-center gap-2">
          {/* Detected Language Chip */}
          <div
            className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-800/90 text-emerald-100 border border-emerald-700/50"
            title="Auto-detected conversation language"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {detectedLanguage === 'urdu'
                ? 'Urdu (اردو)'
                : detectedLanguage === 'roman_urdu'
                ? 'Roman Urdu'
                : detectedLanguage === 'mixed'
                ? 'Urdu + English'
                : 'English'}
            </span>
          </div>

          {/* Pipeline Inspector Button */}
          <button
            id="open-pipeline-inspector-btn"
            onClick={onOpenPipelineInspector}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-medium transition shadow-sm border border-white/20"
            title="View live 12-step processing pipeline"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden md:inline">12-Step Pipeline</span>
          </button>
        </div>
      </div>

      {/* Quick Test Scenarios Bar */}
      <div className="bg-[#f0f2f5] border-b border-slate-200/80 px-3 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0 z-10">
        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Test Scenarios:
        </span>
        {quickScenarios.map((sc, i) => (
          <button
            key={i}
            id={`quick-scenario-btn-${i}`}
            disabled={isProcessing}
            onClick={() => {
              if (sc.type === 'voice') {
                handleSendVoiceNote('', 'audio/webm', sc.duration || 5, sc.text);
              } else {
                onSendMessage({ type: 'text', text: sc.text });
              }
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-emerald-50 active:bg-emerald-100 border border-slate-300 text-slate-700 hover:text-emerald-800 transition whitespace-nowrap shadow-xs disabled:opacity-50 flex items-center gap-1"
            title={sc.desc}
          >
            {sc.type === 'voice' ? (
              <Mic className="w-3 h-3 text-emerald-600" />
            ) : (
              <MessageSquare className="w-3 h-3 text-blue-600" />
            )}
            {sc.label}
          </button>
        ))}
      </div>

      {/* WhatsApp Message Feed */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative"
        style={{
          backgroundImage:
            'radial-gradient(#cfd8dc 1px, transparent 1px), radial-gradient(#cfd8dc 1px, #efeae2 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      >
        {/* Date Stamp */}
        <div className="flex justify-center my-1">
          <span className="bg-white/80 backdrop-blur-xs text-slate-600 font-medium text-[11px] px-3 py-1 rounded-md shadow-xs border border-slate-200/50">
            TODAY &bull; TWO-WAY VOICE + TEXT WHATSAPP AGENT
          </span>
        </div>

        {/* Human Handover Banner if active */}
        {adminConfig.humanHandoverActive && (
          <div className="p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-xs">
            <span>
              <strong>Human Handover Active:</strong> AI replies are paused. Messages are handled by representative.
            </span>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          const isCustomer = msg.sender === 'customer';

          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-2.5 shadow-sm relative ${
                  isCustomer
                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                    : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/50'
                }`}
              >
                {/* Sender badge if AI */}
                {isAi && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mb-1">
                    <Bot className="w-3 h-3" />
                    <span>ViralScale AI Assistant</span>
                    <span className="text-slate-400 font-normal">
                      &bull; {msg.type === 'voice' ? 'Voice Note' : 'Text Reply'}
                    </span>
                  </div>
                )}

                {/* Message Content: Voice or Text */}
                {msg.type === 'voice' ? (
                  <AudioMessageBubble message={msg} isAi={isAi} />
                ) : (
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.detectedLanguage === 'urdu' ? 'font-serif text-right text-[15px]' : ''
                    }`}
                    dir={msg.detectedLanguage === 'urdu' ? 'rtl' : 'ltr'}
                  >
                    {msg.text}
                  </p>
                )}

                {/* Timestamp & Read Receipts */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                  <span>{msg.timestamp}</span>
                  {isCustomer && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-emerald-200 rounded-tl-none max-w-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>
                  {currentProcessingStep
                    ? `Step ${currentProcessingStep.step}/12: ${currentProcessingStep.name}`
                    : 'AI is thinking & processing message...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Unified memory, language detection, intent matching, and audio synthesis in progress.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Input Bar */}
      <div className="bg-[#f0f2f5] px-2 py-2 sm:px-3 border-t border-slate-300 flex items-center gap-1.5 sm:gap-2 z-10">
        <button
          type="button"
          className="p-2 text-slate-600 hover:text-slate-800 rounded-full hover:bg-slate-200/60 transition"
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="p-2 text-slate-600 hover:text-slate-800 rounded-full hover:bg-slate-200/60 transition"
          title="Attach product media or brief"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input Form */}
        <form onSubmit={handleSendText} className="flex-1 flex items-center">
          <input
            id="whatsapp-text-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
            placeholder={
              isProcessing
                ? 'AI is preparing response...'
                : 'Type a message (Urdu, Roman Urdu, English)...'
            }
            className="w-full bg-white text-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner border border-slate-200"
          />
        </form>

        {/* Either Send button (if typing text) or Voice Recorder (if text is empty) */}
        {inputText.trim().length > 0 ? (
          <button
            id="whatsapp-send-text-btn"
            type="button"
            onClick={() => handleSendText()}
            disabled={isProcessing}
            className="p-2.5 bg-[#00a884] hover:bg-[#008f6f] active:bg-[#007b5e] text-white rounded-full transition shadow disabled:opacity-50"
            title="Send text message"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <VoiceRecorder
            onSendVoiceNote={handleSendVoiceNote}
            disabled={isProcessing}
          />
        )}
      </div>
    </div>
  );
};
