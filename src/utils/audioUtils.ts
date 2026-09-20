/**
 * Audio processing utilities for WhatsApp Voice Messages
 */

// Convert raw 16-bit PCM buffer to standard WAV Blob
export function pcmToWavBlob(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  // Write PCM data
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Convert base64 PCM string to WAV Data URL or playable Audio URL
export function base64PcmToWavUrl(base64Pcm: string, sampleRate: number = 24000): string {
  try {
    const binaryString = atob(base64Pcm);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = pcmToWavBlob(bytes, sampleRate);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error converting PCM to WAV URL:', err);
    return '';
  }
}

// Convert audio Blob to Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Browser Web Speech API fallback for natural speech synthesis
export function speakTextWithBrowser(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: string;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  }
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this environment');
    options?.onEnd?.();
    return { stop: () => {} };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;

  // Try to select appropriate voice
  const voices = window.speechSynthesis.getVoices();
  const lang = options?.lang || 'en-US';
  
  // Look for Urdu/Hindi or English voice depending on content
  const targetVoice = voices.find(v => v.lang.startsWith(lang)) || 
                      voices.find(v => v.lang.includes('ur') || v.lang.includes('hi')) || 
                      voices[0];
  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  utterance.onend = () => {
    options?.onEnd?.();
  };
  utterance.onerror = (e) => {
    console.warn('Speech synthesis utterance error:', e);
    options?.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      window.speechSynthesis.cancel();
    }
  };
}

// Generate realistic waveform heights array for visualization (0.1 to 1.0)
export function generateWaveformPattern(count: number = 36, seed: number = 42): number[] {
  const bars: number[] = [];
  let prev = 0.4;
  for (let i = 0; i < count; i++) {
    const rand = Math.sin(i * 0.45 + seed) * 0.35 + Math.cos(i * 0.25) * 0.25 + 0.45;
    const smoothed = Math.min(1.0, Math.max(0.15, (prev + rand) / 2));
    prev = smoothed;
    bars.push(smoothed);
  }
  return bars;
}

// Format seconds to mm:ss
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
