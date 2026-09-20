import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, ChevronDown, ChevronUp, Volume2, AlertCircle } from 'lucide-react';
import { formatDuration, generateWaveformPattern, speakTextWithBrowser } from '../utils/audioUtils';
import { ChatMessage } from '../types';

interface AudioMessageBubbleProps {
  message: ChatMessage;
  isAi: boolean;
  onVoiceSpeedChange?: (speed: number) => void;
}

export const AudioMessageBubble: React.FC<AudioMessageBubbleProps> = ({
  message,
  isAi,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthControllerRef = useRef<{ stop: () => void } | null>(null);

  const duration = message.durationSec || 6;
  const waveform = React.useMemo(() => {
    // Generate deterministic waveform based on message id length
    return generateWaveformPattern(28, (message.id.length * 13) % 50);
  }, [message.id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthControllerRef.current) {
        synthControllerRef.current.stop();
      }
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthControllerRef.current) {
        synthControllerRef.current.stop();
      }
      setIsPlaying(false);
    } else {
      // Play
      if (message.audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio(message.audioUrl);
          audioRef.current.playbackRate = speed;
          audioRef.current.ontimeupdate = () => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          };
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
          };
        }
        audioRef.current.playbackRate = speed;
        audioRef.current.play().catch(err => {
          console.warn('Audio playback error, falling back to speech synthesis:', err);
          startSpeechFallback();
        });
        setIsPlaying(true);
      } else {
        startSpeechFallback();
      }
    }
  };

  const startSpeechFallback = () => {
    setIsPlaying(true);
    let simulatedSec = 0;
    const interval = setInterval(() => {
      simulatedSec += 0.25 * speed;
      setCurrentTime(prev => {
        if (prev >= duration) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return Math.min(duration, simulatedSec);
      });
    }, 250);

    const lang = message.detectedLanguage === 'urdu' ? 'ur-PK' : 'en-US';
    synthControllerRef.current = speakTextWithBrowser(message.text, {
      rate: speed,
      lang,
      onEnd: () => {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentTime(0);
      },
      onError: () => {
        clearInterval(interval);
        setIsPlaying(false);
      },
    });
  };

  const handleSpeedCycle = () => {
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const progressPercent = Math.min(100, (currentTime / duration) * 100);

  return (
    <div className="w-full max-w-xs sm:max-w-sm">
      {/* Audio Player Row */}
      <div className="flex items-center gap-2 sm:gap-3 py-1">
        {/* Avatar with Mic badge */}
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-xs ${
              isAi ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}
          >
            {isAi ? 'AI' : 'HK'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white">
            <Mic className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          id={`audio-play-btn-${message.id}`}
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition shadow-sm ${
            isAi
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play Voice Note'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        {/* Waveform & Scrubber */}
        <div className="flex-1 flex flex-col justify-center">
          <div
            className="flex items-center gap-0.5 h-7 cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              const newTime = clickPos * duration;
              setCurrentTime(newTime);
              if (audioRef.current) {
                audioRef.current.currentTime = newTime;
              }
            }}
          >
            {waveform.map((barHeight, idx) => {
              const barPercent = (idx / waveform.length) * 100;
              const isPlayed = barPercent <= progressPercent;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-colors"
                  style={{
                    height: `${Math.round(barHeight * 22) + 4}px`,
                    backgroundColor: isPlayed
                      ? isAi ? '#065f46' : '#047857'
                      : isAi ? '#a7f3d0' : '#cbd5e1',
                  }}
                />
              );
            })}
          </div>

          {/* Time & Speed Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5 px-0.5">
            <span>
              {isPlaying ? formatDuration(currentTime) : formatDuration(duration)}
            </span>
            <button
              id={`speed-cycle-btn-${message.id}`}
              onClick={handleSpeedCycle}
              className="px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-slate-300 font-semibold text-[10px] text-slate-700 transition"
              title="Voice Speed"
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Warning if Voice failed */}
      {message.isVoiceFallback && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Text fallback delivered (Voice server was offline).</span>
        </div>
      )}

      {/* Transcription Accordion */}
      <div className="mt-1 border-t border-black/5 pt-1">
        <button
          id={`toggle-transcript-${message.id}`}
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center justify-between w-full text-[11px] font-medium text-slate-600 hover:text-slate-900 py-0.5"
        >
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-emerald-600" />
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </span>
          {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTranscript && (
          <div
            className={`mt-1 text-[13px] leading-relaxed p-2 rounded bg-black/5 text-slate-800 ${
              message.detectedLanguage === 'urdu' ? 'font-serif text-right text-sm' : ''
            }`}
            dir={message.detectedLanguage === 'urdu' ? 'rtl' : 'ltr'}
          >
            {message.transcription || message.text}
          </div>
        )}
      </div>
    </div>
  );
};
