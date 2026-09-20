import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Volume2,
  FileText,
  Languages,
  Database,
  UserCheck,
  Radio,
  Zap,
} from 'lucide-react';
import { PipelineStepLog } from '../types';

interface PipelineInspectorProps {
  logs: PipelineStepLog[];
  isProcessing: boolean;
  currentStep?: number;
  totalDurationMs?: number;
}

const STEP_ICONS: Record<number, React.ReactNode> = {
  1: <Radio className="w-4 h-4 text-emerald-600" />,
  2: <Cpu className="w-4 h-4 text-blue-600" />,
  3: <Volume2 className="w-4 h-4 text-purple-600" />,
  4: <Languages className="w-4 h-4 text-amber-600" />,
  5: <Sparkles className="w-4 h-4 text-rose-600" />,
  6: <Database className="w-4 h-4 text-cyan-600" />,
  7: <FileText className="w-4 h-4 text-indigo-600" />,
  8: <UserCheck className="w-4 h-4 text-teal-600" />,
  9: <Database className="w-4 h-4 text-orange-600" />,
  10: <Zap className="w-4 h-4 text-emerald-600" />,
  11: <Volume2 className="w-4 h-4 text-pink-600" />,
  12: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
};

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({
  logs,
  isProcessing,
  currentStep = 1,
  totalDurationMs,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  // Standard 12 steps template if logs are empty yet
  const defaultStepNames = [
    { num: 1, name: 'Receive WhatsApp Message', desc: 'Secure audio/text ingestion via webhook' },
    { num: 2, name: 'Process Audio Payload', desc: 'Decode voice buffer & verify metadata' },
    { num: 3, name: 'Convert Speech to Text', desc: 'Transcribe using Gemini 3.5 Transcribe' },
    { num: 4, name: 'Detect Customer Language', desc: 'Classify: Urdu, Roman Urdu, English, Mixed' },
    { num: 5, name: 'Understand Intent & Mode', desc: 'Identify goals and explicit switch preferences' },
    { num: 6, name: 'Load Conversation Memory', desc: 'Unify context across text & voice turns' },
    { num: 7, name: 'Extract Business Info', desc: 'Parse video duration, product, budget, platform' },
    { num: 8, name: 'Update Customer Profile', desc: 'Lead qualification & CRM state sync' },
    { num: 9, name: 'Check Knowledge Base', desc: 'Query 15s/30s/60s packages, FAQs, policies' },
    { num: 10, name: 'Generate Answer', desc: 'Gemini 3.8 Flash natural conversational response' },
    { num: 11, name: 'Convert Answer to Speech', desc: 'Gemini 3.1 Flash TTS voice synthesis' },
    { num: 12, name: 'Send WhatsApp Response', desc: 'Dispatch voice note or text message' },
  ];

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 shadow-lg border border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              12-Step Processing Pipeline
              {isProcessing && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 animate-pulse">
                  Step {currentStep}/12 Running
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Live observability of Voice &amp; Text ingestion, transcription, and TTS
            </p>
          </div>
        </div>

        {totalDurationMs !== undefined && (
          <div className="text-right text-[11px] text-slate-400 font-mono">
            Total: <span className="text-emerald-400 font-semibold">{totalDurationMs}ms</span>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1 text-xs">
        {defaultStepNames.map((template) => {
          const log = logs.find(l => l.stepNumber === template.num);
          const isCompleted = log?.status === 'completed';
          const isSkipped = log?.status === 'skipped';
          const isFailed = log?.status === 'failed';
          const isCurrent = isProcessing && currentStep === template.num;
          const isExpanded = !!expandedSteps[template.num];

          let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
          if (isCurrent) badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse';
          else if (isCompleted) badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40';
          else if (isSkipped) badgeColor = 'bg-slate-800/40 text-slate-500 border-slate-800';
          else if (isFailed) badgeColor = 'bg-red-950/60 text-red-300 border-red-800/40';

          return (
            <div
              key={template.num}
              className={`border rounded-lg transition-all ${badgeColor}`}
            >
              <div
                onClick={() => log?.details && toggleStep(template.num)}
                className={`p-2 flex items-center justify-between ${
                  log?.details ? 'cursor-pointer hover:bg-slate-800/50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-300 shrink-0">
                    {template.num}
                  </span>
                  <div className="shrink-0">{STEP_ICONS[template.num]}</div>
                  <div className="truncate">
                    <span className="font-medium text-slate-200">
                      {log?.name || template.name}
                    </span>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log?.description || template.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {log?.durationMs !== undefined && (
                    <span className="font-mono text-[10px] text-slate-400">
                      {log.durationMs}ms
                    </span>
                  )}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isSkipped && <span className="text-[10px] text-slate-500">skip</span>}
                  {isFailed && <span className="text-[10px] text-red-400">failed</span>}
                  {isCurrent && <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                  {log?.details && (
                    <span className="text-slate-500">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </div>
              </div>

              {/* Expandable JSON details */}
              {isExpanded && log?.details && (
                <div className="px-3 pb-2 pt-1 border-t border-slate-800/80 bg-slate-950/60 rounded-b-lg font-mono text-[11px] text-slate-300">
                  <pre className="overflow-x-auto whitespace-pre-wrap py-1">
                    {typeof log.details === 'string'
                      ? log.details
                      : JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
