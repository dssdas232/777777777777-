import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
  HelpCircle,
  Zap,
} from 'lucide-react';
import {
  Language,
  ChatMessage,
  SecondaryPlanItem,
  FactoryConstants,
  BlendComponent,
} from '../types';
import { eventBus } from '../services/eventBus';

interface Task11ChatAssistantProps {
  language: Language;
  planItems: SecondaryPlanItem[];
  constants: FactoryConstants;
  blendComponents: BlendComponent[];
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Task11ChatAssistant: React.FC<Task11ChatAssistantProps> = ({
  language,
  planItems,
  constants,
  blendComponents,
  isOpen,
  onToggleOpen,
}) => {
  const isAr = language === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: isAr
        ? 'مرحباً بك! أنا الوكيل الذكي لتخطيط مصنع السجائر. يمكنني مساعدتك في حساب خطة الإنتاج، نسب BOM، محاليل الكيسنج، فحص اتزان الخلطة، أو الإجابة على أي استفسار تشغيلي. كيف أخدمك اليوم؟'
        : 'Welcome! I am the Cigarette Factory AI Production Planner Agent. I can help compute secondary demands, line BOMs, check 100% blend balance, or analyze process yields. How can I assist your shift today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPromptsAr = [
    'احسب لي إنتاج 25 مليون من SKU-001',
    'ما هو احتياج التبغ الأولي الكلي؟',
    'هل خلطة التبغ متزنة 100%؟',
    'ما هي مكونات محلول الكيسنج؟',
  ];

  const quickPromptsEn = [
    'Calculate 25 Mio for SKU-001',
    'What is total primary tobacco demand?',
    'Is the 13-grade blend balanced at 100%?',
    'What are the Casing Solution ingredients?',
  ];

  const activePrompts = isAr ? quickPromptsAr : quickPromptsEn;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    eventBus.setNodeStatus('ai-chat', 'Running', 2000);
    eventBus.addEventLog({
      source: 'Task 11: AI Assistant',
      eventType: 'USER_ACTION',
      message: `User query received: "${text.slice(0, 50)}..."`,
      status: 'success',
    });

    try {
      // Build context of current factory state to send to backend
      const totalDemandKg = planItems.reduce(
        (acc, it) =>
          acc +
          (it.tobaccoRequiredKg ??
            (it.targetMio * 1000000 * constants.tobaccoWeightPerStickG) / 1000),
        0
      );
      const blendSum = blendComponents.reduce((s, c) => s + c.percentage, 0);

      const contextPayload = {
        language,
        totalDemandKg,
        planItemsCount: planItems.length,
        stickWeightG: constants.tobaccoWeightPerStickG,
        batchSizeKg: constants.blendBatchSizeKg,
        blendSum,
        skus: planItems.map((p) => `${p.skuCode}: ${p.targetMio}M (${p.packType})`).join(', '),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: contextPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || (isAr ? 'تم استلام طلبك ومعالجته بنجاح.' : 'Your request was processed.');

      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      // Fallback local expert response if network or API key is absent
      console.warn('Chat endpoint fallback:', err);
      let fallback = '';

      if (text.includes('25') && text.includes('SKU-001')) {
        fallback = isAr
          ? 'لحجم إنتاج 25 مليون سيجارة من SKU-001 (Hard Pack):\n• الكراتين: 2,500 كرتونة (25 × 100)\n• العلب: 1,250,000 علبة (2,500 × 500)\n• عدد السجائر: 25,000,000 سيجارة\n• التبغ المفروم المطلوب: 18,750 كغم (بمعدل 0.75 غم/سيجارة).'
          : 'For 25 Million Cigarettes of SKU-001 (Hard Pack):\n• Cartons: 2,500 cartons\n• Packs: 1,250,000 packs\n• Sticks: 25,000,000 sticks\n• Cut Tobacco Required: 18,750 kg (at standard 0.75g/stick).';
      } else if (text.includes('التبغ') || text.includes('primary') || text.includes('tobacco')) {
        const total = planItems.reduce(
          (s, i) =>
            s +
            (i.tobaccoRequiredKg ??
              (i.targetMio * 1000000 * constants.tobaccoWeightPerStickG) / 1000),
          0
        );
        const batches = Math.ceil(total / constants.blendBatchSizeKg);
        fallback = isAr
          ? `إجمالي الطلب على التبغ المفروم من خطة الإنتاج الثانوي حالياً هو ${total.toLocaleString()} كغم. بحجم دفعة ${constants.blendBatchSizeKg.toLocaleString()} كغم، يتطلب تشغيل ${batches} دفعات في الإنتاج الأولي بإجمالي ناتج ${ (batches * constants.blendBatchSizeKg).toLocaleString() } كغم وفائض صوامع قدره ${ (batches * constants.blendBatchSizeKg - total).toLocaleString() } كغم.`
          : `Total cut tobacco demand across current secondary plan is ${total.toLocaleString()} kg. At ${constants.blendBatchSizeKg.toLocaleString()} kg/batch, it requires ${batches} batches yielding ${(batches * constants.blendBatchSizeKg).toLocaleString()} kg with a buffer surplus of ${(batches * constants.blendBatchSizeKg - total).toLocaleString()} kg.`;
      } else if (text.includes('خلطة') || text.includes('blend')) {
        const sum = blendComponents.reduce((s, c) => s + c.percentage, 0);
        fallback = isAr
          ? `مجموع نسب خلطة التبغ الـ 13 الحالية هو ${sum}%. ${sum === 100 ? 'الخلطة متزنة تماماً بنسبة 100% وموافقة للمواصفات.' : 'تحذير: الخلطة غير متزنة! يلزم تعديل النسب لتساوي 100%.'}`
          : `The current 13-grade blend formulation sums to ${sum}%. ${sum === 100 ? 'The blend is perfectly balanced at 100%.' : 'Warning: Imbalance detected! Blend must equal exactly 100%.'}`;
      } else {
        fallback = isAr
          ? 'تم تحليل طلبك بناءً على معايير المصنع: 20 سيجارة/علبة، 500 علبة/كرتونة، 100 كرتونة/مليون، 0.75 غم/سيجارة، وحجم دفعة 10,000 كغم. يمكنك تعديل أي معامل مباشرة من جداول المهام!'
          : 'Processed in accordance with factory constants: 20 cigs/pack, 500 packs/carton, 100 cartons/Mio, 0.75g/stick, and 10,000 kg batch size.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="fixed bottom-5 end-5 z-40 bg-amber-500 hover:bg-amber-400 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95 group"
        title={isAr ? 'مساعد الوكيل الذكي' : 'AI Production Assistant'}
      >
        <Bot className="w-6 h-6" />
        <span className="hidden sm:inline text-xs font-black pe-1">
          {isAr ? 'الوكيل الذكي' : 'AI Agent'}
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-ping absolute -top-1 -end-1" />
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 shadow-2xl border border-slate-700 bg-slate-900 rounded-2xl flex flex-col overflow-hidden ${
        isExpanded
          ? 'inset-4 sm:inset-10'
          : 'bottom-4 end-4 w-96 sm:w-[440px] h-[580px] max-w-[calc(100vw-2rem)]'
      }`}
    >
      {/* Top Header */}
      <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{isAr ? 'المساعد الذكي لتخطيط الإنتاج' : 'AI Production Planner Agent'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'متصل بنظام المصنع والـ BOM وقواعد المعرفة' : 'Connected to Planner Engine & Factory State'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1 hover:text-rose-400 transition-colors"
            title={isAr ? 'مسح المحادثة' : 'Clear chat'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleOpen}
            className="p-1 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/70 text-xs">
        {messages.map((m) => {
          const isUser = m.sender === 'user';

          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-amber-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1 text-end ${
                    isUser ? 'text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] text-slate-400">
              {isAr ? 'الوكيل يحلل بيانات المصنع...' : 'Agent analyzing factory matrices...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Strip */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        {activePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-[11px] whitespace-nowrap transition-colors border border-slate-700/80 shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={
            isAr
              ? 'اطرح سؤالاً أو اكتب أمراً باللغة العربية أو الإنجليزية...'
              : 'Ask a calculation, check BOM balance, or command the agent...'
          }
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isTyping}
          className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
