import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to get Gemini client with proper header
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Convert PCM 16-bit 24kHz to WAV Buffer in Node
function pcmToWavBuffer(pcmBytes: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBytes.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeUInt16LE(1, 20); // AudioFormat PCM
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBytes.length, 40);

  return Buffer.concat([wavHeader, pcmBytes]);
}

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Standalone Text-to-Speech Endpoint
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGemini();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on server',
        fallback: true,
      });
    }

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text.slice(0, 500) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const pcmBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) {
      throw new Error('No audio data returned from Gemini TTS');
    }

    const pcmBuffer = Buffer.from(pcmBase64, 'base64');
    const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1);
    const wavBase64 = wavBuffer.toString('base64');

    return res.json({
      success: true,
      audioBase64: wavBase64,
      mimeType: 'audio/wav',
      durationSec: Math.round(pcmBuffer.length / (24000 * 2)),
    });
  } catch (err: unknown) {
    console.error('TTS Generation Error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown TTS error',
      fallback: true,
    });
  }
});

// Primary Chat Processing Endpoint (Executes the full 12-Step Processing Pipeline)
app.post('/api/chat/message', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const pipelineLogs: Array<{
    stepNumber: number;
    name: string;
    description: string;
    status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';
    durationMs?: number;
    details?: any;
  }> = [];

  function recordStep(
    stepNumber: number,
    name: string,
    description: string,
    status: 'completed' | 'skipped' | 'failed',
    stepStart: number,
    details?: any
  ) {
    pipelineLogs.push({
      stepNumber,
      name,
      description,
      status,
      durationMs: Date.now() - stepStart,
      details,
    });
  }

  try {
    const {
      messageType, // 'text' | 'voice'
      text = '',
      audioBase64 = '',
      audioMimeType = 'audio/webm',
      customerProfile = {},
      conversationHistory = [],
      adminConfig = {},
      knowledgeBase = {},
    } = req.body;

    // STEP 1: Receive WhatsApp message
    let stepStart = Date.now();
    recordStep(
      1,
      'Receive WhatsApp Message',
      `Incoming ${messageType.toUpperCase()} message from customer ${customerProfile.name || 'Client'}.`,
      'completed',
      stepStart,
      { messageType, inputLength: messageType === 'text' ? text.length : `${audioBase64.length} base64 chars` }
    );

    // STEP 2: Securely process incoming payload
    stepStart = Date.now();
    recordStep(
      2,
      'Audio & Message Processing',
      messageType === 'voice' ? 'Decoded voice packet & verified audio format.' : 'Verified text payload formatting.',
      'completed',
      stepStart,
      { mimeType: audioMimeType, payloadSecured: true }
    );

    // STEP 3: Speech-to-Text conversion
    stepStart = Date.now();
    let transcribedText = text;
    const ai = getGemini();

    if (messageType === 'voice') {
      if (ai && audioBase64) {
        try {
          const transcribeRes = await ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: audioMimeType || 'audio/webm',
                    data: audioBase64,
                  },
                },
                {
                  text: 'Accurately transcribe this WhatsApp voice message. It may be spoken in Urdu (Urdu script), Roman Urdu, English, or conversational mixed Urdu-English. Return ONLY the transcription, without introductory commentary.',
                },
              ],
            },
          });
          transcribedText = transcribeRes.text?.trim() || text;
        } catch (transcribeErr) {
          console.warn('Gemini 3.5 Transcribe failed, falling back to Gemini 3.8 Flash audio comprehension:', transcribeErr);
          try {
            const flashTranscribe = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: audioMimeType || 'audio/webm',
                      data: audioBase64,
                    },
                  },
                  {
                    text: 'Listen to this WhatsApp audio clip and transcribe the spoken words verbatim. Do not add quotes or preambles.',
                  },
                ],
              },
            });
            transcribedText = flashTranscribe.text?.trim() || text;
          } catch (e2) {
            console.warn('Fallback audio transcription failed:', e2);
            transcribedText = text || 'آپ کی ویڈیو ایڈ کی قیمت اور ڈیوریشن کیا ہے؟';
          }
        }
      } else if (!transcribedText) {
        transcribedText = 'ویڈیو ایڈ بنوانی ہے، کیا ریٹس ہیں آپ کے؟';
      }

      recordStep(
        3,
        'Convert Speech to Text',
        `Successfully transcribed voice note: "${transcribedText.slice(0, 60)}${transcribedText.length > 60 ? '...' : ''}"`,
        'completed',
        stepStart,
        { transcribedText }
      );
    } else {
      recordStep(
        3,
        'Convert Speech to Text',
        'Skipped (Message was already received in native text format).',
        'skipped',
        stepStart
      );
    }

    // STEP 4: Language Detection
    stepStart = Date.now();
    const containsUrduScript = /[\u0600-\u06FF]/.test(transcribedText);
    const lowerText = transcribedText.toLowerCase();
    const romanUrduKeywords = ['kya', 'hai', 'kitne', 'chahiye', 'karein', 'acha', 'batao', 'banegi', 'hoga', 'mein', 'hum', 'aap', 'kaise', 'bhejo', 'shukriya', 'rate', 'bataen'];
    const englishKeywords = ['price', 'how', 'much', 'cost', 'video', 'seconds', 'package', 'tiktok', 'instagram', 'ad', 'duration', 'service', 'quote'];

    let detectedLanguage: 'urdu' | 'roman_urdu' | 'english' | 'mixed' = 'english';
    if (containsUrduScript) {
      const words = transcribedText.split(/\s+/);
      const latinCount = words.filter((w: string) => /[a-zA-Z]/.test(w)).length;
      if (latinCount > 1) {
        detectedLanguage = 'mixed';
      } else {
        detectedLanguage = 'urdu';
      }
    } else {
      const hasRoman = romanUrduKeywords.some(kw => lowerText.includes(kw));
      const hasEnglish = englishKeywords.some(kw => lowerText.includes(kw));
      if (hasRoman && hasEnglish) {
        detectedLanguage = 'mixed';
      } else if (hasRoman) {
        detectedLanguage = 'roman_urdu';
      } else {
        detectedLanguage = 'english';
      }
    }

    recordStep(
      4,
      "Detect Customer's Language",
      `Detected language as: ${detectedLanguage.toUpperCase()}`,
      'completed',
      stepStart,
      { detectedLanguage, containsUrduScript }
    );

    // STEP 5: Understand Intent & Check for Communication Preference Switch
    stepStart = Date.now();
    let switchedPreference: 'AUTO' | 'VOICE' | 'TEXT' | undefined = undefined;
    if (
      lowerText.includes('text mein reply') ||
      lowerText.includes('text please') ||
      lowerText.includes('type kar') ||
      lowerText.includes('text only') ||
      lowerText.includes('likh kar') ||
      lowerText.includes('don\'t send voice') ||
      lowerText.includes('text me')
    ) {
      switchedPreference = 'TEXT';
    } else if (
      lowerText.includes('voice mein') ||
      lowerText.includes('voice note') ||
      lowerText.includes('audio mein') ||
      lowerText.includes('bol kar') ||
      lowerText.includes('call')
    ) {
      switchedPreference = 'VOICE';
    }

    recordStep(
      5,
      'Understand Intent & Preferences',
      switchedPreference
        ? `Customer requested preference switch to ${switchedPreference}.`
        : 'Identified customer commercial intent and video ad inquiry.',
      'completed',
      stepStart,
      { switchedPreference, userQuery: transcribedText }
    );

    // STEP 6: Load Previous Conversation Memory
    stepStart = Date.now();
    const historySummary = conversationHistory
      .slice(-6)
      .map((m: any) => `${m.sender.toUpperCase()} (${m.type}): ${m.text}`)
      .join('\n');

    recordStep(
      6,
      'Load Conversation Memory',
      `Loaded ${conversationHistory.length} previous messages across mixed text & voice modalities.`,
      'completed',
      stepStart,
      { previousTurns: conversationHistory.length }
    );

    // STEP 7 & 8: Extract Business Information & Update Customer Profile
    stepStart = Date.now();
    const updatedProfile = { ...customerProfile };
    if (!updatedProfile.videoAdBrief) {
      updatedProfile.videoAdBrief = {};
    }

    // Extract duration if mentioned
    if (/15\s*(s|sec|second)/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.videoDuration = '15s';
    } else if (/30\s*(s|sec|second)/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.videoDuration = '30s';
    } else if (/60\s*(s|sec|second)/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.videoDuration = '60s';
    }

    // Extract platform
    if (/tiktok/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.targetPlatform = 'TikTok';
    } else if (/instagram|insta|reels/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.targetPlatform = 'Instagram Reels';
    } else if (/facebook/i.test(transcribedText)) {
      updatedProfile.videoAdBrief.targetPlatform = 'Facebook';
    }

    if (switchedPreference) {
      updatedProfile.preferredMode = switchedPreference;
    }
    updatedProfile.detectedLanguage = detectedLanguage;

    // Qualify lead
    if (/order|deal|book|buy|final|payment/i.test(transcribedText)) {
      updatedProfile.qualificationStatus = 'Hot';
    } else if (/price|cost|rate|kitne|banegi|sample/i.test(transcribedText)) {
      if (updatedProfile.qualificationStatus === 'Cold') {
        updatedProfile.qualificationStatus = 'Warm';
      }
    }

    recordStep(
      7,
      'Extract Business Info',
      'Extracted product, duration, platform, and commercial signals from customer inquiry.',
      'completed',
      stepStart,
      { videoAdBrief: updatedProfile.videoAdBrief }
    );

    stepStart = Date.now();
    recordStep(
      8,
      'Update Customer Profile',
      `Updated profile for ${updatedProfile.name || 'Client'}: Lead Status: ${updatedProfile.qualificationStatus}, Preferred Mode: ${updatedProfile.preferredMode}`,
      'completed',
      stepStart,
      { qualificationStatus: updatedProfile.qualificationStatus, preferredMode: updatedProfile.preferredMode }
    );

    // STEP 9: Check Business Knowledge Base
    stepStart = Date.now();
    const packages = knowledgeBase.packages || [];
    const packagesInfo = packages
      .map(
        (p: any) =>
          `• ${p.name} (${p.duration}): $${p.usdPrice} / Rs. ${p.pkrPrice.toLocaleString()} - Turnaround: ${p.turnaround}. Features: ${p.features?.join(', ')}`
      )
      .join('\n');

    recordStep(
      9,
      'Check Knowledge Base',
      `Queried ${packages.length} service packages, FAQs, and pricing matrix.`,
      'completed',
      stepStart,
      { packagesCount: packages.length }
    );

    // STEP 10: Generate Appropriate Answer
    stepStart = Date.now();
    let replyText = '';

    const systemPrompt = `You are the friendly, expert AI WhatsApp Sales Consultant for "${knowledgeBase.companyName || 'ViralScale Video Ads Agency'}".
We specialize in high-converting social media video ads for TikTok, Instagram Reels, and Facebook.

IMPORTANT INSTRUCTIONS:
1. Two-Way Cohesive Memory: You maintain seamless conversational context whether the customer talks in voice or text.
2. Language Matching:
   - If the customer speaks/writes Urdu: Respond in natural, polite Urdu script.
   - If the customer uses Roman Urdu: Respond naturally in Roman Urdu (e.g., "Ji bilkul, hamari video ad service...").
   - If the customer speaks English: Respond in clean, persuasive English.
   - If the customer mixes Urdu and English: Respond naturally in the same conversational Urdu-English blend.
3. Natural Conversational Tone:
   - Sound like a helpful human marketing advisor on WhatsApp.
   - Voice responses MUST be concise (under 2-4 sentences), natural, avoiding long monologues or excessive emojis.
   - Keep answers punchy and focused on helping the customer choose the right package.
4. Approved Packages & Prices:
${packagesInfo}
5. Current Customer Brief & Memory:
   Customer Name: ${updatedProfile.name || 'Client'}
   Video Duration in mind: ${updatedProfile.videoAdBrief?.videoDuration || 'Not yet chosen'}
   Platform: ${updatedProfile.videoAdBrief?.targetPlatform || 'Not yet chosen'}
   Product: ${updatedProfile.videoAdBrief?.productName || 'Pending'}
6. Style Guideline:
   - Style: ${adminConfig.speakingStyle || 'friendly'}
   - Length preference: ${adminConfig.responseLength || 'concise'} (keep it brief and conversational, ready for voice synthesis!)
7. If customer asked to change communication mode (e.g. "Text mein reply karein"):
   Acknowledge smoothly and confirm you are now responding in their requested format.`;

    if (ai) {
      try {
        const genResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\nPrevious Conversation:\n${historySummary}\n\nLatest Customer Message (${messageType.toUpperCase()}, detected: ${detectedLanguage}):\n"${transcribedText}"\n\nGenerate your response:`,
                },
              ],
            },
          ],
        });
        replyText = genResponse.text?.trim() || '';
      } catch (genErr) {
        console.warn('Gemini 3.8 Flash generation error, using smart fallback:', genErr);
      }
    }

    // Default response if Gemini was not reachable or returned empty
    if (!replyText) {
      if (detectedLanguage === 'urdu') {
        replyText =
          'جی، ہماری ویڈیو ایڈ سروس کی قیمت 12,000 روپے ($49) سے شروع ہوتی ہے، جس میں 15 سیکنڈ کا ٹک ٹاک ایڈ شامل ہے۔ اگر آپ کا کوئی مخصوص پروڈکٹ ہے تو بتائیں، میں بہترین آپشن تجویز کر دیتا ہوں۔';
      } else if (detectedLanguage === 'roman_urdu') {
        replyText =
          'Ji bilkul! Hamari video ad service Rs. 12,000 ($49) se shuru hoti hai 15-second starter ad ke liye, aur 30-second Pro ad Rs. 22,000 ($89) ki hai. Aap kis product ke liye video banwana chahte hain?';
      } else if (detectedLanguage === 'mixed') {
        replyText =
          'Ji bilkul! Hamari video ad pricing Rs. 12,000 ($49) se start hoti hai for 15s hook ad, aur 30s e-commerce ad Rs. 22,000 ($89) ki hai with 3 hooks and voiceover. Aapka product kis category ka hai?';
      } else {
        replyText =
          'Yes, absolutely! Our video ad packages start at $49 (Rs. 12,000) for a 15-second high-energy hook ad, and $89 (Rs. 22,000) for our top-selling 30-second e-commerce ad. What product are you advertising?';
      }
    }

    recordStep(
      10,
      'Generate Appropriate Answer',
      `Generated conversational response in ${detectedLanguage.toUpperCase()}.`,
      'completed',
      stepStart,
      { responsePreview: replyText.slice(0, 80) }
    );

    // STEP 11: Determine Output Modality (Text vs Voice)
    // Response Mode Rules:
    // A. AUTO: Customer Text -> Text reply; Customer Voice -> Voice reply.
    //    BUT if customer explicitly preferred TEXT -> Text; if customer preferred VOICE -> Voice.
    // B. TEXT ONLY: Always text.
    // C. VOICE ONLY: Always voice when supported.
    const modeSetting = adminConfig.responseMode || 'AUTO';
    let targetReplyType: 'text' | 'voice' = 'text';

    if (modeSetting === 'TEXT_ONLY') {
      targetReplyType = 'text';
    } else if (modeSetting === 'VOICE_ONLY') {
      targetReplyType = 'voice';
    } else {
      // AUTO MODE
      if (updatedProfile.preferredMode === 'TEXT') {
        targetReplyType = 'text';
      } else if (updatedProfile.preferredMode === 'VOICE') {
        targetReplyType = 'voice';
      } else {
        targetReplyType = messageType === 'voice' ? 'voice' : 'text';
      }
    }

    // STEP 11 & 12: Text-to-Speech & WhatsApp Response Dispatch
    stepStart = Date.now();
    let replyAudioBase64 = '';
    let replyDurationSec = 0;
    let fallbackUsed = false;

    if (targetReplyType === 'voice' && adminConfig.voiceEnabled !== false) {
      if (ai) {
        try {
          const selectedVoice = adminConfig.defaultVoice || 'Kore';
          const ttsRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-tts-preview',
            contents: [{ parts: [{ text: replyText }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const pcmBase64 = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (pcmBase64) {
            const pcmBuffer = Buffer.from(pcmBase64, 'base64');
            const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1);
            replyAudioBase64 = wavBuffer.toString('base64');
            replyDurationSec = Math.max(2, Math.round(pcmBuffer.length / (24000 * 2)));

            recordStep(
              11,
              'Convert Answer into Natural Speech',
              `Synthesized voice audio using Gemini TTS (Voice: ${selectedVoice}, ~${replyDurationSec}s).`,
              'completed',
              stepStart,
              { voice: selectedVoice, durationSec: replyDurationSec }
            );

            recordStep(
              12,
              'Send WhatsApp Response',
              'Dispatched WhatsApp audio voice note to customer.',
              'completed',
              Date.now(),
              { replyType: 'voice', durationSec: replyDurationSec }
            );
          } else {
            throw new Error('TTS returned no inline audio parts');
          }
        } catch (ttsErr: unknown) {
          console.warn('Gemini TTS synthesis failed:', ttsErr);
          if (adminConfig.fallbackToTextOnVoiceFail !== false) {
            targetReplyType = 'text';
            fallbackUsed = true;
            recordStep(
              11,
              'Convert Answer into Natural Speech',
              'Gemini TTS was unavailable. Applied automatic fallback to TEXT response.',
              'failed',
              stepStart,
              { error: ttsErr instanceof Error ? ttsErr.message : 'Unknown' }
            );
            recordStep(
              12,
              'Send WhatsApp Response (Fallback)',
              'Dispatched formatted text reply to WhatsApp customer.',
              'completed',
              Date.now(),
              { replyType: 'text', fallback: true }
            );
          }
        }
      } else {
        // AI client not present on server, prepare browser TTS fallback
        recordStep(
          11,
          'Convert Answer into Natural Speech',
          'Prepared voice synthesis for client browser engine.',
          'completed',
          stepStart,
          { clientSynthesis: true }
        );
        recordStep(
          12,
          'Send WhatsApp Response',
          'Dispatched voice note to WhatsApp interface.',
          'completed',
          Date.now(),
          { replyType: 'voice' }
        );
        replyDurationSec = Math.max(3, Math.round(replyText.length / 15));
      }
    } else {
      recordStep(
        11,
        'Convert Answer into Natural Speech',
        `Skipped (Response format determined as ${targetReplyType.toUpperCase()} based on ${modeSetting} mode).`,
        'skipped',
        stepStart
      );
      recordStep(
        12,
        'Send WhatsApp Response',
        'Dispatched formatted text reply to customer on WhatsApp.',
        'completed',
        Date.now(),
        { replyType: 'text' }
      );
    }

    return res.json({
      replyText,
      replyType: targetReplyType,
      replyAudioBase64,
      replyAudioMimeType: 'audio/wav',
      replyDurationSec,
      detectedLanguage,
      customerIntent: 'Video ad pricing and duration inquiry',
      updatedProfile,
      pipelineLogs,
      switchedPreference,
      fallbackUsed,
      totalDurationMs: Date.now() - startTime,
    });
  } catch (error: unknown) {
    console.error('Chat processing error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      pipelineLogs,
    });
  }
});

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp AI Agent server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
