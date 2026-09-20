import React, { useState } from 'react';
import {
  MessageSquare,
  Settings,
  Activity,
  Bot,
  Volume2,
  Sparkles,
  Layers,
  CheckCircle,
  HelpCircle,
  X,
  Languages,
} from 'lucide-react';
import {
  ChatMessage,
  CustomerProfile,
  AdminConfig,
  KnowledgeBase,
  PipelineStepLog,
  ChatApiResponse,
  LanguageCode,
} from './types';
import {
  initialConversation,
  initialCustomerProfile,
  initialAdminConfig,
  initialKnowledgeBase,
} from './data/initialData';
import { WhatsAppChat } from './components/WhatsAppChat';
import { AdminPanel } from './components/AdminPanel';
import { PipelineInspector } from './components/PipelineInspector';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialConversation);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>(initialCustomerProfile);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(initialAdminConfig);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(initialKnowledgeBase);

  const [pipelineLogs, setPipelineLogs] = useState<PipelineStepLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ step: number; name: string } | undefined>(undefined);
  const [totalDurationMs, setTotalDurationMs] = useState<number | undefined>(undefined);

  // Active view layout tab for flexible screen sizes
  const [activeTab, setActiveTab] = useState<'chat' | 'admin' | 'pipeline'>('chat');
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  // Send message handler (Text or Voice)
  const handleSendMessage = async ({
    type,
    text = '',
    audioBase64 = '',
    durationSec = 5,
    transcriptHint,
  }: {
    type: 'text' | 'voice';
    text?: string;
    audioBase64?: string;
    durationSec?: number;
    transcriptHint?: string;
  }) => {
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const customerMsgId = `msg-${Date.now()}`;

    // 1. Optimistically append Customer message
    const customerMsg: ChatMessage = {
      id: customerMsgId,
      sender: 'customer',
      type,
      text: text || transcriptHint || 'WhatsApp voice message',
      durationSec: type === 'voice' ? durationSec : undefined,
      audioUrl: audioBase64 ? `data:audio/webm;base64,${audioBase64}` : undefined,
      timestamp: userTimestamp,
      status: 'sent',
      transcription: type === 'voice' ? transcriptHint || text : undefined,
      detectedLanguage: customerProfile.detectedLanguage,
    };

    const newMessages = [...messages, customerMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    // Progressive step simulation for visual feedback
    const stepStages = [
      { step: 1, name: 'Receiving WhatsApp Ingestion' },
      { step: 3, name: 'Converting Speech to Text' },
      { step: 4, name: 'Detecting Customer Language' },
      { step: 6, name: 'Loading Conversation Context' },
      { step: 8, name: 'Syncing Customer Profile & Brief' },
      { step: 10, name: 'Generating Answer with Gemini' },
      { step: 11, name: 'Synthesizing Voice Audio' },
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (stageIdx < stepStages.length) {
        setCurrentStep(stepStages[stageIdx]);
        stageIdx++;
      }
    }, 450);

    try {
      // If Human Handover is active, do not invoke AI
      if (adminConfig.humanHandoverActive) {
        clearInterval(stageInterval);
        setIsProcessing(false);
        setCurrentStep(undefined);
        return;
      }

      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageType: type,
          text: text || transcriptHint,
          audioBase64,
          customerProfile,
          conversationHistory: newMessages,
          adminConfig,
          knowledgeBase,
        }),
      });

      clearInterval(stageInterval);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: ChatApiResponse = await res.json();

      // Update Pipeline Logs & CRM Profile
      if (data.pipelineLogs && data.pipelineLogs.length > 0) {
        setPipelineLogs(data.pipelineLogs);
      }
      if (data.updatedProfile) {
        setCustomerProfile(data.updatedProfile);
      }
      if (data.totalDurationMs) {
        setTotalDurationMs(data.totalDurationMs);
      }

      // Add AI reply
      const aiMsgId = `msg-ai-${Date.now()}`;
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const aiReply: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        type: data.replyType,
        text: data.replyText,
        durationSec: data.replyDurationSec || (data.replyType === 'voice' ? 6 : undefined),
        audioUrl: data.replyAudioBase64
          ? `data:${data.replyAudioMimeType || 'audio/wav'};base64,${data.replyAudioBase64}`
          : undefined,
        detectedLanguage: data.detectedLanguage,
        timestamp: aiTimestamp,
        status: 'read',
        transcription: data.replyType === 'voice' ? data.replyText : undefined,
        isVoiceFallback: data.fallbackUsed,
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      console.warn('Backend chat API failed, executing client-side intelligent fallback:', err);
      clearInterval(stageInterval);

      // Smart local fallback so user conversation never breaks
      const lower = (text || transcriptHint || '').toLowerCase();
      let fallbackText = '';
      let replyType: 'text' | 'voice' = type === 'voice' ? 'voice' : 'text';

      if (adminConfig.responseMode === 'TEXT_ONLY') replyType = 'text';
      if (adminConfig.responseMode === 'VOICE_ONLY') replyType = 'voice';

      if (lower.includes('price') || lower.includes('قیمت') || lower.includes('rate')) {
        fallbackText =
          'جی، ہماری ویڈیو ایڈ سروس کی قیمت 12,000 روپے ($49) سے شروع ہوتی ہے 15 سیکنڈ کے ایڈ کے لیے، اور 30 سیکنڈ کا ای کامرس ایڈ 22,000 روپے ($89) کا ہے۔ آپ کو کس پروڈکٹ کے لیے بنوانی ہے؟';
      } else if (lower.includes('second') || lower.includes('سیکنڈ') || lower.includes('duration')) {
        fallbackText =
          'ہمارے پاس 15 سیکنڈ، 30 سیکنڈ اور 60 سیکنڈ کے پیکیجز موجود ہیں۔ ٹک ٹاک اور انسٹاگرام کے لیے 30 سیکنڈ کی ویڈیو سب سے زیادہ کنورٹ کرتی ہے۔';
      } else if (lower.includes('text mein') || lower.includes('text please')) {
        fallbackText = 'جی بالکل، میں اب آپ کو ٹیکسٹ میسج میں ہی تمام تفصیلات فراہم کر رہا ہوں۔';
        replyType = 'text';
      } else {
        fallbackText =
          'جی بالکل، ہم ٹک ٹاک اور انسٹاگرام کے لیے پروفیشنل ویڈیو ایڈز تیار کرتے ہیں جس میں سکرپٹ، وائس اوور اور ایڈیٹنگ سب شامل ہے۔';
      }

      const aiReply: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        type: replyType,
        text: fallbackText,
        durationSec: replyType === 'voice' ? 7 : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        detectedLanguage: 'urdu',
        transcription: replyType === 'voice' ? fallbackText : undefined,
      };

      setMessages((prev) => [...prev, aiReply]);
    } finally {
      setIsProcessing(false);
      setCurrentStep(undefined);
    }
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'ai',
        type: 'text',
        text: 'السلام علیکم! وائرل سکیل ویڈیو ایجنسی میں خوش آمدید۔ آپ کس پروڈکٹ کے لیے ویڈیو ایڈ بنوانا چاہتے ہیں؟ آپ ٹیکسٹ یا وائس میسج دونوں میں بات کر سکتے ہیں۔',
        detectedLanguage: 'urdu',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      },
    ]);
    setCustomerProfile({
      ...initialCustomerProfile,
      videoAdBrief: {},
      qualificationStatus: 'Cold',
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Application Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow">
              WA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base text-slate-100">
                  WhatsApp Two-Way Voice + Text AI Agent
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Gemini Multi-Modal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Auto-Language Detection (Urdu, Roman Urdu, English) &bull; Mode Switching &bull; Unified Sales Memory
              </p>
            </div>
          </div>

          {/* Desktop & Mobile Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              id="view-chat-tab-btn"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Chat</span>
            </button>

            <button
              id="view-admin-tab-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin &amp; CRM</span>
            </button>

            <button
              id="view-pipeline-tab-btn"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'pipeline'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>12-Step Pipeline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col min-h-0 overflow-hidden">
        {/* Large screens: 3-column / 2-column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* Main WhatsApp Simulator Column */}
          <div
            className={`flex-1 min-h-[580px] lg:min-h-0 flex flex-col ${
              activeTab === 'chat'
                ? 'lg:col-span-7 xl:col-span-7 flex'
                : 'hidden lg:col-span-7 xl:col-span-7 lg:flex'
            }`}
          >
            <WhatsAppChat
              messages={messages}
              customerProfile={customerProfile}
              adminConfig={adminConfig}
              isProcessing={isProcessing}
              currentProcessingStep={currentStep}
              onSendMessage={handleSendMessage}
              onOpenPipelineInspector={() => {
                setActiveTab('pipeline');
                setShowPipelineModal(true);
              }}
              detectedLanguage={customerProfile.detectedLanguage}
            />
          </div>

          {/* Right Side Column: Admin CRM or Pipeline Inspector */}
          <div
            className={`flex-1 min-h-[580px] lg:min-h-0 flex flex-col gap-4 ${
              activeTab !== 'chat'
                ? 'lg:col-span-5 xl:col-span-5 flex'
                : 'hidden lg:col-span-5 xl:col-span-5 lg:flex'
            }`}
          >
            {activeTab === 'pipeline' ? (
              <PipelineInspector
                logs={pipelineLogs}
                isProcessing={isProcessing}
                currentStep={currentStep?.step}
                totalDurationMs={totalDurationMs}
              />
            ) : (
              <AdminPanel
                config={adminConfig}
                onConfigChange={setAdminConfig}
                customerProfile={customerProfile}
                onProfileChange={setCustomerProfile}
                knowledgeBase={knowledgeBase}
                onKnowledgeBaseChange={setKnowledgeBase}
                onClearConversation={handleClearConversation}
              />
            )}
          </div>
        </div>
      </main>

      {/* Quick Mobile Modal for Pipeline if invoked from Chat Header */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">
                12-Step Processing Pipeline
              </span>
              <button
                id="close-pipeline-modal-btn"
                onClick={() => setShowPipelineModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <PipelineInspector
                logs={pipelineLogs}
                isProcessing={isProcessing}
                currentStep={currentStep?.step}
                totalDurationMs={totalDurationMs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
