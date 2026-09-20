import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Radio } from 'lucide-react';
import { blobToBase64 } from '../utils/audioUtils';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioBase64: string, mimeType: string, durationSec: number, transcriptHint?: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceNote,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionError(null);
    audioChunksRef.current = [];
    setRecordDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.warn('Microphone permission or hardware issue:', err);
      setMicPermissionError('Microphone not accessible. You can also use the Instant Voice Test chips above.');
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordDuration(0);
    audioChunksRef.current = [];
  };

  const finishAndSend = async () => {
    if (!mediaRecorderRef.current) return;
    const finalSec = Math.max(1, recordDuration);

    if (timerRef.current) clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64 = await blobToBase64(audioBlob);
      onSendVoiceNote(base64, 'audio/webm', finalSec);
      setIsRecording(false);
      setRecordDuration(0);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.stop();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 bg-red-50/90 border border-red-200 rounded-full px-4 py-2 w-full animate-fadeIn shadow-inner">
        {/* Pulsing red record indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-red-700 font-mono font-medium text-sm">
            {formatTimer(recordDuration)}
          </span>
        </div>

        {/* Dynamic visual waveform animation */}
        <div className="flex-1 flex items-center gap-1 justify-center h-5">
          {[16, 24, 12, 28, 18, 26, 14, 22, 10, 24, 16, 20].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${h}px`,
                animationDelay: `${i * 120}ms`,
                animationDuration: '800ms',
              }}
            />
          ))}
        </div>

        {/* Cancel Button */}
        <button
          id="cancel-voice-record-btn"
          type="button"
          onClick={cancelRecording}
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition"
          title="Cancel recording"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          id="send-voice-record-btn"
          type="button"
          onClick={finishAndSend}
          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shadow"
          title="Send Voice Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {micPermissionError && (
        <span className="text-[11px] text-red-600 mr-2 max-w-[150px] truncate" title={micPermissionError}>
          {micPermissionError}
        </span>
      )}
      <button
        id="start-mic-record-btn"
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="p-2.5 rounded-full text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition disabled:opacity-50"
        title="Record WhatsApp Voice Note"
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
};
