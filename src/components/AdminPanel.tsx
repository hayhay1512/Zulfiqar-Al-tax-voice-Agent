import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  Sliders,
  Database,
  User,
  ShoppingBag,
  UserCheck,
  Headphones,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  PhoneCall,
  Save,
} from 'lucide-react';
import {
  AdminConfig,
  CustomerProfile,
  KnowledgeBase,
  ResponseMode,
  VoicePersona,
  SpeakingStyle,
  ResponseLength,
  LeadStatus,
} from '../types';
import { speakTextWithBrowser } from '../utils/audioUtils';

interface AdminPanelProps {
  config: AdminConfig;
  onConfigChange: (newConfig: AdminConfig) => void;
  customerProfile: CustomerProfile;
  onProfileChange: (newProfile: CustomerProfile) => void;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: (newKB: KnowledgeBase) => void;
  onClearConversation?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onConfigChange,
  customerProfile,
  onProfileChange,
  knowledgeBase,
  onKnowledgeBaseChange,
  onClearConversation,
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'voice' | 'crm' | 'knowledge'>('modes');
  const [testVoiceText, setTestVoiceText] = useState('جی، ہماری ویڈیو ایڈ سروس کی قیمت بارہ ہزار روپے سے شروع ہوتی ہے۔');
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const voicePersonas: Array<{ id: VoicePersona; label: string; gender: string; style: string }> = [
    { id: 'Kore', label: 'Kore', gender: 'Female', style: 'Warm, natural, consultative & friendly' },
    { id: 'Puck', label: 'Puck', gender: 'Male', style: 'Energetic, engaging & expressive' },
    { id: 'Zephyr', label: 'Zephyr', gender: 'Female', style: 'Soft, professional & clear' },
    { id: 'Fenrir', label: 'Fenrir', gender: 'Male', style: 'Authoritative, deep & confident' },
    { id: 'Charon', label: 'Charon', gender: 'Male', style: 'Calm, measured & corporate' },
  ];

  const handleTestVoice = () => {
    setIsPlayingTestVoice(true);
    speakTextWithBrowser(testVoiceText, {
      rate: config.voiceSpeed,
      lang: config.languageMode === 'urdu' ? 'ur-PK' : 'en-US',
      onEnd: () => setIsPlayingTestVoice(false),
      onError: () => setIsPlayingTestVoice(false),
    });
  };

  const notifyChange = (updated: Partial<AdminConfig>) => {
    onConfigChange({ ...config, ...updated });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-800 text-sm">
            AI Agent Control Panel &amp; Unified CRM
          </h2>
        </div>
        {saveSuccess && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-fadeIn">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-100/60 text-xs font-medium">
        <button
          id="admin-tab-modes"
          onClick={() => setActiveTab('modes')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === 'modes'
              ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Response Modes
        </button>
        <button
          id="admin-tab-voice"
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === 'voice'
              ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Voice Controls
        </button>
        <button
          id="admin-tab-crm"
          onClick={() => setActiveTab('crm')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === 'crm'
              ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer &amp; Brief
        </button>
        <button
          id="admin-tab-knowledge"
          onClick={() => setActiveTab('knowledge')}
          className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
            activeTab === 'knowledge'
              ? 'border-emerald-600 text-emerald-700 bg-white font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Knowledge Base
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
        {/* TAB 1: RESPONSE MODES */}
        {activeTab === 'modes' && (
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-slate-800 text-sm block mb-1">
                WhatsApp Response Mode
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Dictates how the agent determines whether to send a voice message or a text message back to the customer.
              </p>

              <div className="space-y-2.5">
                {/* AUTO MODE */}
                <label
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${
                    config.responseMode === 'AUTO'
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="responseMode"
                    value="AUTO"
                    checked={config.responseMode === 'AUTO'}
                    onChange={() => notifyChange({ responseMode: 'AUTO' })}
                    className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      A. AUTO MODE (Recommended)
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Intelligent
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      The AI automatically mirrors the customer: Text customer → Text reply; Voice customer → Voice reply.
                      Honors explicit requests (e.g. &ldquo;Text mein reply karein&rdquo;).
                    </p>
                  </div>
                </label>

                {/* TEXT ONLY */}
                <label
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${
                    config.responseMode === 'TEXT_ONLY'
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="responseMode"
                    value="TEXT_ONLY"
                    checked={config.responseMode === 'TEXT_ONLY'}
                    onChange={() => notifyChange({ responseMode: 'TEXT_ONLY' })}
                    className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      B. TEXT ONLY
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      The AI always responds using formatted text, even if the customer sends a voice message.
                    </p>
                  </div>
                </label>

                {/* VOICE ONLY */}
                <label
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition ${
                    config.responseMode === 'VOICE_ONLY'
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="responseMode"
                    value="VOICE_ONLY"
                    checked={config.responseMode === 'VOICE_ONLY'}
                    onChange={() => notifyChange({ responseMode: 'VOICE_ONLY' })}
                    className="mt-0.5 mr-3 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      C. VOICE ONLY
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      The AI responds using natural voice messages whenever technically supported.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Human Handover Toggle */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
                    Human Agent Handover Mode
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Pause AI automated replies to let a live human representative take over the chat.
                  </p>
                </div>
                <button
                  id="human-handover-toggle"
                  onClick={() => notifyChange({ humanHandoverActive: !config.humanHandoverActive })}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                    config.humanHandoverActive
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {config.humanHandoverActive ? 'Human Takeover Active' : 'Enable Handover'}
                </button>
              </div>
            </div>

            {/* Reset / Clear Conversation */}
            {onClearConversation && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  id="clear-chat-history-btn"
                  onClick={onClearConversation}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Conversation
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VOICE RESPONSE CONTROLS */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            {/* Voice Enabled switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="font-semibold text-slate-900 text-xs">Voice Replies Active</span>
                <p className="text-[11px] text-slate-500">Enable Gemini Speech-to-Text &amp; Text-to-Speech generation</p>
              </div>
              <input
                type="checkbox"
                id="voice-enabled-checkbox"
                checked={config.voiceEnabled}
                onChange={(e) => notifyChange({ voiceEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
            </div>

            {/* Default Voice Selection */}
            <div>
              <label className="font-semibold text-slate-800 text-xs block mb-1">
                Default Voice Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {voicePersonas.map((v) => (
                  <button
                    key={v.id}
                    id={`voice-persona-btn-${v.id}`}
                    type="button"
                    onClick={() => notifyChange({ defaultVoice: v.id })}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      config.defaultVoice === v.id
                        ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">{v.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {v.gender}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{v.style}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Speaking Style & Response Length */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 text-xs block mb-1">
                  Speaking Style
                </label>
                <select
                  id="speaking-style-select"
                  value={config.speakingStyle}
                  onChange={(e) => notifyChange({ speakingStyle: e.target.value as SpeakingStyle })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="friendly">Friendly &amp; Conversational</option>
                  <option value="sales">Consultative Sales Advisor</option>
                  <option value="concise">Concise Express</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 text-xs block mb-1">
                  Response Length
                </label>
                <select
                  id="response-length-select"
                  value={config.responseLength}
                  onChange={(e) => notifyChange({ responseLength: e.target.value as ResponseLength })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="concise">Concise (&lt; 30s audio)</option>
                  <option value="balanced">Balanced (30-45s audio)</option>
                  <option value="detailed">Detailed (Explains all packages)</option>
                </select>
              </div>
            </div>

            {/* Voice Speed */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-800 text-xs">Voice Pace / Speed</label>
                <span className="font-mono text-xs text-emerald-700">{config.voiceSpeed}x</span>
              </div>
              <div className="flex gap-2">
                {[0.8, 1.0, 1.2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => notifyChange({ voiceSpeed: s })}
                    className={`flex-1 py-1.5 text-xs rounded border transition font-medium ${
                      config.voiceSpeed === s
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s}x {s === 1.0 ? '(Normal)' : s < 1.0 ? '(Slower)' : '(Brisk)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fallback Switch */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-xs">
                    Automatic Text Fallback on Error
                  </span>
                  <p className="text-[11px] text-slate-500">
                    If voice synthesis fails, immediately deliver a clean text message and alert admin.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="fallback-checkbox"
                  checked={config.fallbackToTextOnVoiceFail}
                  onChange={(e) => notifyChange({ fallbackToTextOnVoiceFail: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Voice Test Box */}
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
              <label className="font-semibold text-emerald-900 text-xs block mb-1">
                Audition Natural Speech
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testVoiceText}
                  onChange={(e) => setTestVoiceText(e.target.value)}
                  className="flex-1 text-xs p-2 rounded border border-emerald-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleTestVoice}
                  disabled={isPlayingTestVoice}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded transition flex items-center gap-1 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {isPlayingTestVoice ? 'Playing...' : 'Test Voice'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMER CRM & VIDEO AD BRIEF */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900 text-xs">Customer Profile (Live Memory)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {customerProfile.detectedLanguage?.toUpperCase() || 'URDU'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Name:</span>
                  <input
                    type="text"
                    value={customerProfile.name}
                    onChange={(e) => onProfileChange({ ...customerProfile, name: e.target.value })}
                    className="w-full p-1 rounded border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Phone:</span>
                  <input
                    type="text"
                    value={customerProfile.phone}
                    onChange={(e) => onProfileChange({ ...customerProfile, phone: e.target.value })}
                    className="w-full p-1 rounded border border-slate-200"
                  />
                </div>
              </div>

              {/* Lead Status & Preference */}
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Lead Qualification:</span>
                  <select
                    value={customerProfile.qualificationStatus}
                    onChange={(e) =>
                      onProfileChange({ ...customerProfile, qualificationStatus: e.target.value as LeadStatus })
                    }
                    className="w-full p-1 rounded border border-slate-200 font-medium bg-white"
                  >
                    <option value="Cold">Cold (Curious)</option>
                    <option value="Warm">Warm (Asking prices)</option>
                    <option value="Hot">Hot (Ready to buy)</option>
                    <option value="Qualified">Qualified (Brief complete)</option>
                    <option value="Converted">Converted (Paid order)</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Saved Preference:</span>
                  <select
                    value={customerProfile.preferredMode}
                    onChange={(e) =>
                      onProfileChange({
                        ...customerProfile,
                        preferredMode: e.target.value as 'AUTO' | 'VOICE' | 'TEXT',
                      })
                    }
                    className="w-full p-1 rounded border border-slate-200 font-medium bg-white"
                  >
                    <option value="AUTO">Auto (Mirror input)</option>
                    <option value="VOICE">Voice (Prefers Audio)</option>
                    <option value="TEXT">Text (Prefers Text)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Video Ad Brief Extracted Slots */}
            <div className="border border-slate-200 rounded-lg p-3">
              <h4 className="font-semibold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                Live Video Ad Brief (Extracted from Chat)
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Product / Business Name:</span>
                  <input
                    type="text"
                    value={customerProfile.videoAdBrief?.productName || ''}
                    placeholder="e.g. Leather Wallet, Organic Serum"
                    onChange={(e) =>
                      onProfileChange({
                        ...customerProfile,
                        videoAdBrief: { ...customerProfile.videoAdBrief, productName: e.target.value },
                      })
                    }
                    className="w-full p-1.5 rounded border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Video Duration:</span>
                    <input
                      type="text"
                      value={customerProfile.videoAdBrief?.videoDuration || ''}
                      placeholder="e.g. 15s / 30s / 60s"
                      onChange={(e) =>
                        onProfileChange({
                          ...customerProfile,
                          videoAdBrief: { ...customerProfile.videoAdBrief, videoDuration: e.target.value },
                        })
                      }
                      className="w-full p-1.5 rounded border border-slate-200 font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Target Platform:</span>
                    <input
                      type="text"
                      value={customerProfile.videoAdBrief?.targetPlatform || ''}
                      placeholder="TikTok, Reels, Facebook"
                      onChange={(e) =>
                        onProfileChange({
                          ...customerProfile,
                          videoAdBrief: { ...customerProfile.videoAdBrief, targetPlatform: e.target.value },
                        })
                      }
                      className="w-full p-1.5 rounded border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Goal &amp; Budget:</span>
                  <input
                    type="text"
                    value={customerProfile.videoAdBrief?.budget || ''}
                    placeholder="e.g. $89 (Rs. 22,000)"
                    onChange={(e) =>
                      onProfileChange({
                        ...customerProfile,
                        videoAdBrief: { ...customerProfile.videoAdBrief, budget: e.target.value },
                      })
                    }
                    className="w-full p-1.5 rounded border border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KNOWLEDGE BASE & PRICING */}
        {activeTab === 'knowledge' && (
          <div className="space-y-3">
            <div>
              <span className="font-semibold text-slate-800 text-xs block mb-1">
                Agency Name &amp; Core Service
              </span>
              <input
                type="text"
                value={knowledgeBase.companyName}
                onChange={(e) => onKnowledgeBaseChange({ ...knowledgeBase, companyName: e.target.value })}
                className="w-full p-1.5 text-xs rounded border border-slate-300 font-medium"
              />
            </div>

            <div>
              <span className="font-semibold text-slate-800 text-xs block mb-1.5">
                Approved Video Packages &amp; Pricing
              </span>
              <div className="space-y-2">
                {knowledgeBase.packages.map((pkg, idx) => (
                  <div key={pkg.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{pkg.name}</span>
                      <span className="text-emerald-700">
                        ${pkg.usdPrice} / Rs. {pkg.pkrPrice.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{pkg.description}</p>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {pkg.features.map((f, i) => (
                        <span key={i} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-800 text-xs block mb-1">Turnaround &amp; Revisions</span>
              <p className="text-xs text-slate-600 p-2 rounded bg-slate-50 border border-slate-200">
                {knowledgeBase.turnaroundPolicy} &bull; {knowledgeBase.revisionPolicy}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
