import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Radio,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Send,
  Bot,
  User,
  Zap,
} from 'lucide-react';
import { LiveVoiceService, LiveVoiceState, VoiceMessage } from '../services/liveVoiceService';
import { Language } from '../types';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const isAr = language === 'ar';
  const [state, setState] = useState<LiveVoiceState>('disconnected');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const voiceServiceRef = useRef<LiveVoiceService | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && !voiceServiceRef.current) {
      voiceServiceRef.current = new LiveVoiceService({
        onStateChange: (newState) => {
          setState(newState);
          if (newState === 'connected' || newState === 'listening') {
            setErrorMessage(null);
          }
        },
        onAudioLevel: (inLvl, outLvl) => {
          const combined = Math.max(inLvl, outLvl);
          setAudioLevel(combined);
        },
        onTranscript: (msg) => {
          setMessages((prev) => {
            const index = prev.findIndex((m) => m.id === msg.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = msg;
              return updated;
            }
            return [...prev, msg];
          });
        },
        onError: (err) => {
          setErrorMessage(err);
        },
      });

      // Automatically connect and request mic on modal open
      voiceServiceRef.current.connect().then(() => {
        voiceServiceRef.current?.startMicrophone();
      });
    }

    return () => {
      if (!isOpen && voiceServiceRef.current) {
        voiceServiceRef.current.disconnect();
        voiceServiceRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  if (!isOpen) return null;

  const handleToggleMute = () => {
    if (!voiceServiceRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    voiceServiceRef.current.setMuted(nextMuted);
  };

  const handleStart = async () => {
    setErrorMessage(null);
    if (!voiceServiceRef.current) {
      voiceServiceRef.current = new LiveVoiceService({
        onStateChange: setState,
        onAudioLevel: (inLvl, outLvl) => setAudioLevel(Math.max(inLvl, outLvl)),
        onTranscript: (msg) => {
          setMessages((prev) => {
            const index = prev.findIndex((m) => m.id === msg.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = msg;
              return updated;
            }
            return [...prev, msg];
          });
        },
        onError: setErrorMessage,
      });
    }
    await voiceServiceRef.current.connect();
    await voiceServiceRef.current.startMicrophone();
  };

  const handleDisconnect = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.disconnect();
      voiceServiceRef.current = null;
    }
    setState('disconnected');
    setAudioLevel(0);
  };

  const handleInterrupt = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.handleInterruption();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !voiceServiceRef.current) return;
    voiceServiceRef.current.sendTextMessage(inputText.trim());
    setInputText('');
  };

  const sampleQuestions = isAr
    ? [
        'كم عدد دفعات الإنتاج الأولي المطلوبة؟',
        'ما هي مكونات ونسب خلطة التبغ الـ 13؟',
        'اشرح مراحل معالجة السيقان ومعدل العائد القياسي',
        'ما هي مواصفات خط التجهيز LU#01 وسرعته؟',
      ]
    : [
        'How many primary production batches are required?',
        'What are the 13 grades in the master tobacco blend?',
        'Explain the 5-stage stem processing mass balance',
        'What is the speed and machinery of packaging line LU#01?',
      ];

  const getStateBadge = () => {
    switch (state) {
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Radio className="w-3 h-3 animate-pulse" />
            {isAr ? 'جارِ الاتصال بـ gemini-3.8-live...' : 'Connecting to gemini-3.8-live...'}
          </span>
        );
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {isAr ? 'يستمع الآن (16kHz PCM)...' : 'Listening (16kHz PCM)...'}
          </span>
        );
      case 'speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Volume2 className="w-3.5 h-3.5 animate-bounce" />
            {isAr ? 'الوكيل يتحدث (24kHz PCM)...' : 'Agent Speaking (24kHz PCM)...'}
          </span>
        );
      case 'interrupted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Zap className="w-3 h-3 text-rose-400" />
            {isAr ? 'تمت المقاطعة الفورية' : 'Interrupted by User'}
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3 h-3" />
            {isAr ? 'خطأ في الاتصال' : 'Connection Error'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            {isAr ? 'غير متصل' : 'Disconnected'}
          </span>
        );
    }
  };

  // Dynamic visualizer pulse size based on audio level
  const pulseScale = 1 + audioLevel * 0.45;
  const outerRingScale = 1 + audioLevel * 0.85;

  return (
    <div
      id="voice-conversation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'المحادثة الصوتية الحية' : 'Live Voice Conversations'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'بث صوتي ثنائي الاتجاه بالزمن الفعلي (Live API) مع وكيل المصنع الذكي'
                  : 'Real-time bidirectional audio streaming (Live API) with Factory Production Agent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStateBadge()}
            <button
              id="voice-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Animated Visualizer Centerpiece */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <div
                className="w-48 h-48 rounded-full bg-amber-500/20 blur-2xl transition-transform duration-100"
                style={{ transform: `scale(${outerRingScale})` }}
              />
            </div>

            {/* Audio Wave / Pulse Rings */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              {/* Outer reactive ring */}
              <div
                className="absolute inset-0 rounded-full border border-amber-500/20 transition-transform duration-75"
                style={{ transform: `scale(${outerRingScale})`, opacity: 0.2 + audioLevel * 0.8 }}
              />
              {/* Middle reactive ring */}
              <div
                className="absolute inset-2 rounded-full border-2 border-amber-500/40 transition-transform duration-75"
                style={{ transform: `scale(${pulseScale})` }}
              />

              {/* Core interactive button */}
              <button
                id="voice-mic-core-btn"
                onClick={state === 'disconnected' ? handleStart : handleToggleMute}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                  state === 'disconnected'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : isMuted
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : state === 'speaking'
                    ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-cyan-500/25'
                    : 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-amber-500/25'
                }`}
                title={
                  state === 'disconnected'
                    ? isAr
                      ? 'بدء الاتصال'
                      : 'Start Connection'
                    : isMuted
                    ? isAr
                      ? 'إلغاء كتم الميكروفون'
                      : 'Unmute Microphone'
                    : isAr
                    ? 'كتم الميكروفون'
                    : 'Mute Microphone'
                }
              >
                {state === 'disconnected' ? (
                  <MicOff className="w-8 h-8" />
                ) : isMuted ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : state === 'speaking' ? (
                  <Volume2 className="w-8 h-8 text-white animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8 text-white animate-pulse" />
                )}
              </button>
            </div>

            {/* Visualizer Status Text & Instructions */}
            <div className="text-center space-y-1 z-10">
              <p className="text-sm font-semibold text-slate-200">
                {state === 'speaking'
                  ? isAr
                    ? 'الوكيل يتحدث الآن... يمكنك مقاطعته في أي لحظة'
                    : 'Agent is speaking... You can interrupt anytime by speaking.'
                  : state === 'listening'
                  ? isMuted
                    ? isAr
                      ? 'الميكروفون مكتوم حالياً'
                      : 'Microphone is currently muted'
                    : isAr
                    ? 'تحدث الآن بحرية، الوكيل يستمع إليك مباشرة...'
                    : 'Speak naturally, the agent is listening in real time...'
                  : state === 'connecting'
                  ? isAr
                    ? 'جارِ إنشاء اتصال WebSocket بجلسة gemini-3.8-live...'
                    : 'Establishing WebSocket session with gemini-3.8-live...'
                  : isAr
                  ? 'انقر على الميكروفون لبدء المحادثة الصوتية'
                  : 'Click the microphone to start voice conversation'}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Audio Spec: 16kHz PCM In • 24kHz PCM Out • Low-Latency Duplex
              </p>
            </div>

            {/* Quick Action Bar under Visualizer */}
            <div className="flex items-center gap-2 mt-4 z-10">
              {state === 'speaking' && (
                <button
                  id="voice-interrupt-btn"
                  onClick={handleInterrupt}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isAr ? 'مقاطعة الوكيل' : 'Interrupt Agent'}
                </button>
              )}

              {state !== 'disconnected' && (
                <>
                  <button
                    id="voice-mute-toggle-btn"
                    onClick={handleToggleMute}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      isMuted
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : isAr ? 'كتم الميكروفون' : 'Mute'}
                  </button>

                  <button
                    id="voice-disconnect-btn"
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {isAr ? 'قطع الاتصال' : 'Disconnect'}
                  </button>
                </>
              )}

              {state === 'disconnected' && (
                <button
                  id="voice-connect-btn"
                  onClick={handleStart}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isAr ? 'بدء المحادثة' : 'Start Voice Chat'}
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-400">
              {isAr ? 'أسئلة تشغيلية سريعة مقترحة:' : 'Suggested Factory Questions:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  id={`voice-sample-q-${idx}`}
                  onClick={() => {
                    if (voiceServiceRef.current) {
                      voiceServiceRef.current.sendTextMessage(q);
                    }
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-slate-300 transition-colors text-right rtl:text-right ltr:text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript History Feed */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/40 p-4 space-y-3 max-h-56 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-400">
                {isAr ? 'سجل المحادثة المباشرة (Transcript)' : 'Live Conversation Transcript'}
              </span>
              <button
                onClick={() => setMessages([])}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                title={isAr ? 'مسح السجل' : 'Clear Transcript'}
              >
                <RotateCcw className="w-3 h-3" />
                {isAr ? 'مسح' : 'Clear'}
              </button>
            </div>

            {messages.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500 italic">
                {isAr
                  ? 'لم يتم تسجيل نصوص بعد. تحدث عبر الميكروفون ليتم عرض الحوار هنا.'
                  : 'No transcript yet. Speak into the microphone to see the dialogue here.'}
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'gemini' && (
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 text-[10px]">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-amber-600 text-white rounded-br-none'
                        : 'bg-slate-800/90 border border-slate-700 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-[10px] text-slate-300/60 mt-1 text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0 text-[10px]">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Text Input Companion Form */}
          <form onSubmit={handleSendText} className="flex gap-2">
            <input
              id="voice-text-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isAr
                  ? 'أو اكتب استفسارك نصياً لإرساله إلى جلسة gemini-3.8-live...'
                  : 'Or type your query to send into the gemini-3.8-live session...'
              }
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              id="voice-send-btn"
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال' : 'Send'}</span>
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {isAr
                ? 'نموذج البث الصوتي المباشر: gemini-3.8-live • معدل الاستجابة فائق السرعة'
                : 'Live Audio Streaming Model: gemini-3.8-live • Ultra Low-Latency Voice'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            {isAr ? 'إغلاق النافذة' : 'Close Window'}
          </button>
        </div>
      </div>
    </div>
  );
};
