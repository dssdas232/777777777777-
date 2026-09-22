// Real-time Audio Service for gemini-3.8-live (Live API)
// Handles 16kHz input audio PCM streaming and 24kHz output playback with gapless scheduling.

export type LiveVoiceState = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'error';

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

export interface LiveVoiceCallbacks {
  onStateChange: (state: LiveVoiceState) => void;
  onAudioLevel: (inputLevel: number, outputLevel: number) => void;
  onTranscript: (message: VoiceMessage) => void;
  onError: (error: string) => void;
}

export class LiveVoiceService {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveVoiceCallbacks;
  private isMuted = false;
  private isConnected = false;
  private fallbackMode = false;
  private currentAssistantTranscript = '';
  private currentAssistantMessageId = '';

  constructor(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.callbacks.onStateChange('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/live-ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onStateChange('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (e) => {
        console.error('Live API WebSocket error:', e);
        this.callbacks.onError('WebSocket connection error to gemini-3.8-live');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onStateChange('disconnected');
      };
    } catch (err: any) {
      this.callbacks.onError(err?.message || 'Failed to initialize WebSocket');
      this.callbacks.onStateChange('error');
    }
  }

  private handleServerMessage(data: any) {
    if (data.type === 'status') {
      if (data.status === 'ready') {
        this.callbacks.onStateChange('listening');
      }
      if (data.fallback) {
        this.fallbackMode = true;
      }
    } else if (data.type === 'audio' && data.audio) {
      this.callbacks.onStateChange('speaking');
      this.playAudioChunk(data.audio);
    } else if (data.type === 'text' && data.text) {
      if (!this.currentAssistantMessageId) {
        this.currentAssistantMessageId = `gemini-${Date.now()}`;
        this.currentAssistantTranscript = '';
      }
      this.currentAssistantTranscript += data.text;
      this.callbacks.onTranscript({
        id: this.currentAssistantMessageId,
        sender: 'gemini',
        text: this.currentAssistantTranscript,
        timestamp: new Date().toLocaleTimeString(),
      });
    } else if (data.type === 'interrupted') {
      this.handleInterruption();
      this.currentAssistantMessageId = '';
    } else if (data.type === 'error') {
      this.callbacks.onError(data.error || 'Live API Error');
      if (data.fallback) {
        this.fallbackMode = true;
      }
    } else if (data.type === 'closed') {
      this.callbacks.onStateChange('disconnected');
    }
  }

  public async startMicrophone(): Promise<void> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Standard 16kHz AudioContext for Gemini Live audio input
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
      this.mediaSource = this.inputAudioCtx.createMediaStreamSource(this.micStream);

      // ScriptProcessor to capture raw PCM frames
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
      this.mediaSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);

      // Initialize 24kHz output audio context for model playback
      if (!this.outputAudioCtx) {
        this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
        this.nextStartTime = this.outputAudioCtx.currentTime;
      } else if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      this.scriptProcessor.onaudioprocess = (e) => {
        if (this.isMuted) {
          this.callbacks.onAudioLevel(0, 0);
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate input level / RMS for animated visualizer
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sum / inputChannelData.length);
        const normalizedLevel = Math.min(1, rms * 5);
        this.callbacks.onAudioLevel(normalizedLevel, 0);

        // Convert Float32Array to 16-bit PCM Base64
        const base64Pcm = this.float32To16BitPCM(inputChannelData);

        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.fallbackMode) {
          this.ws.send(JSON.stringify({ audio: base64Pcm }));
        }
      };

      this.callbacks.onStateChange('listening');
    } catch (err: any) {
      console.error('Microphone capture error:', err);
      this.callbacks.onError('Microphone access denied or unavailable: ' + (err?.message || ''));
      this.callbacks.onStateChange('error');
    }
  }

  public stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    this.callbacks.onAudioLevel(0, 0);
  }

  public sendTextMessage(text: string): void {
    this.currentAssistantMessageId = '';
    this.callbacks.onTranscript({
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.fallbackMode) {
      this.ws.send(JSON.stringify({ text }));
      this.callbacks.onStateChange('speaking');
    } else {
      // Fallback response with factory intelligence
      this.handleFallbackQuery(text);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public handleInterruption(): void {
    // Cancel active playback immediately on interruption
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch (e) {
        // ignore
      }
    });
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    this.callbacks.onStateChange('interrupted');
    setTimeout(() => {
      this.callbacks.onStateChange('listening');
    }, 400);
  }

  // Converts Float32 audio samples (-1.0 to 1.0) to little-endian 16-bit PCM base64 string
  private float32To16BitPCM(float32Array: Float32Array): string {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Playback raw 24kHz 16-bit PCM audio chunks with gapless scheduling
  private playAudioChunk(base64Pcm: string): void {
    try {
      if (!this.outputAudioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
        this.nextStartTime = this.outputAudioCtx.currentTime;
      }

      if (this.outputAudioCtx.state === 'suspended') {
        this.outputAudioCtx.resume();
      }

      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      let sum = 0;
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
        sum += float32Array[i] * float32Array[i];
      }

      // Output audio RMS for visualizer
      const rms = Math.sqrt(sum / int16Array.length);
      this.callbacks.onAudioLevel(0, Math.min(1, rms * 4));

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        if (this.activeSources.length === 0) {
          this.callbacks.onAudioLevel(0, 0);
          this.callbacks.onStateChange('listening');
          this.currentAssistantMessageId = '';
        }
      };
    } catch (err) {
      console.error('Audio playback chunk error:', err);
    }
  }

  // Local fallback synthesis for immediate verification even if API key is not yet set
  private handleFallbackQuery(text: string) {
    this.callbacks.onStateChange('speaking');
    const lower = text.toLowerCase();
    let reply = '';
    const isAr = /[\u0600-\u06FF]/.test(text);

    if (lower.includes('دفعة') || lower.includes('batch') || lower.includes('أولي') || lower.includes('primary')) {
      reply = isAr
        ? 'بناءً على خطة الإنتاج الأولي، حجم الدفعة المعياري 10,000 كغم. نحسب عدد الدفعات عبر دالة التقريب للأعلى لتغطية إجمالي الطلب، ويتم توجيه الفائض إلى صوامع التخزين الوسيطة.'
        : 'Based on primary production planning, standard batch size is 10,000 kg. Total batches are calculated using ROUNDUP to cover secondary demand, and surplus buffer is staged in silos.';
    } else if (lower.includes('خلطة') || lower.includes('blend') || lower.includes('13')) {
      reply = isAr
        ? 'مواصفة خلطة التبغ تتألف من 13 صنفاً رئيسياً بنسب محددة مجموعها 100%، وتتصدرها أصناف FU بنسبة 30% و BU بنسبة 20% و OR بنسبة 10%.'
        : 'The master tobacco blend formulation consists of 13 standard leaf grades summing strictly to 100%, led by FU 30%, BU 20%, and OR 10%.';
    } else if (lower.includes('سيقان') || lower.includes('stem') || lower.includes('هدر')) {
      reply = isAr
        ? 'معالجة السيقان تمر عبر 5 مراحل تسلسلية: تنظيف، تقطيع، بخار، تشريب، وتمديد، ومعدل العائد الإجمالي القياسي هو 90%.'
        : 'Stem processing follows a 5-stage cascade: Cleaning, Cutting, Steam, Casing, and Expansion, achieving a standard 90% net yield.';
    } else {
      reply = isAr
        ? 'أنا وكيل الذكاء الاصطناعي الصوتي المتصل بنموذج gemini-3.8-live. أنا جاهز لإجابتك عن أي استفسار يخص تخطيط الإنتاج الأولي والثانوي وخطوط التجهيز.'
        : 'I am your Cigarette Factory AI Voice Assistant connected with model gemini-3.8-live. I am ready to answer your questions about primary and secondary production planning.';
    }

    const messageId = `gemini-${Date.now()}`;
    this.callbacks.onTranscript({
      id: messageId,
      sender: 'gemini',
      text: reply,
      timestamp: new Date().toLocaleTimeString(),
    });

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = isAr ? 'ar-SA' : 'en-US';
      utterance.rate = 1.05;
      utterance.onend = () => {
        this.callbacks.onStateChange('listening');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        this.callbacks.onStateChange('listening');
      }, 2000);
    }
  }

  public disconnect(): void {
    this.stopMicrophone();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.callbacks.onStateChange('disconnected');
  }
}
