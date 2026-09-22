import React, { useState, useRef, useEffect } from 'react';
import {
  Language,
  ChatMessage,
  SecondaryPlanItem,
  FactoryConstants,
  BlendComponent,
  ProductionLine,
  ActiveTab,
  ActualProductionRecord,
  AgentNode,
} from '../types';
import {
  Send,
  Bot,
  User,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Layers,
  Factory,
  Boxes,
  RefreshCw,
  Zap,
  Check,
  RotateCcw,
  Sliders,
  TrendingUp,
  Activity,
  ChevronRight,
  Compass,
  Cpu,
  Play,
  Pause,
  Radio,
  Terminal,
  Network,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { eventBus } from '../services/eventBus';
import { excelService, ExcelPlanSummary } from '../services/excelService';
import {
  AgentCommandExecutor,
  AgentCommandExecutionResult,
  AgentContext,
} from '../services/agentCommandExecutor';

export interface ExtendedChatMessage extends ChatMessage {
  excelData?: {
    summary: ExcelPlanSummary;
    items: SecondaryPlanItem[];
    applied?: boolean;
  };
  actionProposal?: {
    type: string;
    title: string;
    items?: SecondaryPlanItem[];
    applied?: boolean;
  };
  commandExecution?: AgentCommandExecutionResult;
}

export interface Task11ChatAssistantProps {
  language: Language;
  planItems: SecondaryPlanItem[];
  constants: FactoryConstants;
  blendComponents: BlendComponent[];
  lines?: ProductionLine[];
  actualRecords?: ActualProductionRecord[];
  isOpen: boolean;
  isFullScreenMode?: boolean;
  onToggleOpen: () => void;
  onApplyPlanUpdate: (newItems: SecondaryPlanItem[]) => void;
  onUpdateConstants?: (constants: FactoryConstants) => void;
  onUpdateLines?: (lines: ProductionLine[]) => void;
  onUpdateBlendComponents?: (components: BlendComponent[]) => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  onAddActualRecord?: (record: Omit<ActualProductionRecord, 'id'>) => void;
  onResetDefaults?: () => void;
}

export const Task11ChatAssistant: React.FC<Task11ChatAssistantProps> = ({
  language,
  planItems,
  constants,
  blendComponents,
  lines = [],
  actualRecords = [],
  isOpen,
  isFullScreenMode = false,
  onToggleOpen,
  onApplyPlanUpdate,
  onUpdateConstants,
  onUpdateLines,
  onUpdateBlendComponents,
  onNavigateTab,
  onAddActualRecord,
  onResetDefaults,
}) => {
  const isAr = language === 'ar';

  const [agentNodes, setAgentNodes] = useState<AgentNode[]>(() => eventBus.getNodes());
  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = eventBus.subscribeNodes((updated) => {
      setAgentNodes(updated);
    });
    return unsub;
  }, []);

  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: isAr
        ? `مرحباً بك! أنا الوكيل الذكي لتخطيط مصنع السجائر.
أنا الآن مزود بـ محرك تحكم وتنفيذ مباشر داخل الوكيل يتحكم في عقد التخطيط (Planner Core, Task 1-10, A2A, ML Engine) ويعدل بيانات المصنع فورياً بناءً على أوامرك الطبيعية، بالإضافة إلى دعم رفع ملفات الإكسل (.xlsx, .xls, .csv).

الأوامر التنفيذية المدعومة للتحكم في الوكيل:
• "شغل دورة الوكيل الشاملة" (تشغيل خط الأنابيب الكامل عبر كافة العقد)
• "طبق توصيات ومعايرة التعلّم التكيفي للماكينات" (Task 8 Engine)
• "أرسل طلب استعلام A2A لوكيل المشتريات والمخازن" (Task 9 Hub)
• "أعد حساب وتحديث جميع نماذج فاتورة المواد BOM" (Tasks 2, 4, 5, 6)
• "أوقف عقدة التعلّم التكيفي" أو "نشط عقدة خطة الثانوي"
• "عدل كمية SKU-001 إلى 30 مليون" أو "احذف صنف SKU-006"
• "وازن خلطة التبغ لتصبح 100%"
• "غير كفاءة الخط الأول LU#01 إلى 90%"`
        : `Welcome! I am your Cigarette Factory AI Production Planner Agent.
I am equipped with a Direct In-Agent Execution & Control Engine that actively orchestrates agent nodes (Planner Core, Tasks 1-10, A2A, ML Engine) and mutates live factory state based on your directives, alongside Excel spreadsheet ingestion.

Supported Agent Control & Execution Directives:
• "Run full agent cycle" (Executes end-to-end 10-node orchestration)
• "Apply adaptive learning calibration" (Task 8 ML Engine)
• "Trigger A2A RPC request to procurement agent" (Task 9 Hub)
• "Recalculate all 4 BOM modules" (Tasks 2, 4, 5, 6)
• "Pause adaptive learning node" or "Resume Task 1 node"
• "Update SKU-001 target to 30 Million" or "Delete SKU-006"
• "Balance 13-grade tobacco blend to 100%"
• "Set LU#01 line efficiency to 90%"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || isFullScreenMode) {
      scrollToBottom();
    }
  }, [messages, isOpen, isFullScreenMode, isTyping]);

  // Quick Executable Command chips
  const executableCommandsAr = [
    { label: '🎯 إرسال أمر تنفيذي مباشر للوكيل', prompt: 'اجعل الوكيل ينفذ الأوامر ويتحكم في خطة المصنع الآن' },
    { label: '🤖 تشغيل دورة الوكيل الكاملة', prompt: 'شغل دورة الوكيل التخطيطية الشاملة لجميع العقد' },
    { label: '⚡ تعديل صنف 1 إلى 30 مليون', prompt: 'عدل كمية صنف 1 إلى 30 مليون سيجارة' },
    { label: '⚡ ضبط كفاءة LU#01 إلى 90%', prompt: 'غير كفاءة الخط الأول LU#01 إلى 90%' },
    { label: '⚖️ موازنة خلطة التبغ 100%', prompt: 'وازن خلطة التبغ لتصل 100% تماماً' },
    { label: '🧠 تطبيق معايرة التعلّم التكيفي', prompt: 'طبق توصيات ومعايرة التعلّم التكيفي على الماكينات' },
    { label: '🧪 إعادة حساب كافة BOM', prompt: 'أعد حساب وتحديث جميع نماذج فاتورة المواد الأربعة BOM' },
    { label: '📡 بث طلب A2A للمشتريات', prompt: 'أرسل طلب استعلام A2A لوكيل المشتريات والمخازن' },
    { label: '⚡ تعديل وزن السيجارة 0.76غ', prompt: 'اضبط وزن السيجارة إلى 0.76 غرام' },
    { label: '⚡ تسجيل وردية إنتاج (Task 7)', prompt: 'سجل وردية إنتاج للخط الأول صنف SKU-001 إنتاج فعلي 17.8 مليون' },
    { label: '🔄 استرجاع معايير المصنع', prompt: 'أعد ضبط بيانات المصنع للوضع الافتراضي' },
    { label: '📊 رفع ملف إكسل', prompt: 'رفع ملف إكسل' },
  ];

  const executableCommandsEn = [
    { label: '🎯 Force Direct Agent Command', prompt: 'Make agent execute commands and control factory plan now' },
    { label: '🤖 Run Full Agent Cycle', prompt: 'Run full agent planning cycle across all nodes' },
    { label: '⚡ Set SKU-001 to 30 Mio', prompt: 'Update SKU-001 target to 30 Million sticks' },
    { label: '⚡ Set LU#01 Efficiency 90%', prompt: 'Set Line LU#01 efficiency to 90%' },
    { label: '⚖️ Balance Blend 100%', prompt: 'Balance 13-grade tobacco blend to 100%' },
    { label: '🧠 Apply ML Calibration', prompt: 'Apply adaptive learning calibration recommendations to machines' },
    { label: '🧪 Recalculate All BOMs', prompt: 'Recalculate all 4 BOM modules and update materials' },
    { label: '📡 Trigger A2A Procurement RPC', prompt: 'Trigger A2A RPC request to procurement agent' },
    { label: '⚡ Set Stick Weight 0.76g', prompt: 'Set tobacco stick weight to 0.76 g' },
    { label: '⚡ Log Shift Run (Task 7)', prompt: 'Log shift record for Line 1 SKU-001 actual 17.8 Mio' },
    { label: '🔄 Reset Defaults', prompt: 'Reset factory data to standard baseline state' },
    { label: '📊 Upload Excel', prompt: 'Upload Excel' },
  ];

  const activeCommands = isAr ? executableCommandsAr : executableCommandsEn;

  // Handle Excel file upload & processing
  const handleProcessExcelFile = async (file: File) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      alert(
        isAr
          ? 'يرجى اختيار ملف إكسل صالح بصيغة (.xlsx أو .xls أو .csv)'
          : 'Please select a valid Excel file (.xlsx, .xls, .csv)'
      );
      return;
    }

    setIsParsingExcel(true);
    setIsTyping(true);

    const userMsg: ExtendedChatMessage = {
      id: `user-file-${Date.now()}`,
      sender: 'user',
      text: isAr
        ? `📎 تم رفع ملف إكسل: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - يرجى تحليله وعكس الخطة على المصنع.`
        : `📎 Uploaded Excel file: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Please analyze and reflect onto factory lines.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const parseResult = await excelService.parseExcelFile(file, constants);

      const aiRes = await fetch('/api/excel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: parseResult.summary,
          items: parseResult.items,
          language,
        }),
      });

      let aiText = '';
      if (aiRes.ok) {
        const data = await aiRes.json();
        aiText = data.text || data.reply || '';
      }

      if (!aiText) {
        const batches = Math.ceil(
          parseResult.summary.totalTobaccoRequiredKg / constants.blendBatchSizeKg
        );
        aiText = isAr
          ? `📊 تم استخراج وتحليل خطة الإنتاج من ملف الإكسل (${file.name}) بنجاح!
• إجمالي الأصناف: ${parseResult.items.length} صنفاً
• حجم الإنتاج المستهدف: ${parseResult.summary.totalMio.toLocaleString()} مليون سيجارة
• عدد الكراتين: ${parseResult.summary.totalCartons.toLocaleString()} كرتونة
• التبغ المفروم المطلوب: ${Math.round(parseResult.summary.totalTobaccoRequiredKg).toLocaleString()} كغم
• دفعات الإنتاج الأولي: ${batches} دفعات (تقريب للأعلى)
• اضغط على الزر أدناه لتطبيق الخطة وعكسها فوراً على المصنع.`
          : `📊 Extracted and analyzed production plan from (${file.name})!
• Total SKUs: ${parseResult.items.length} items
• Target Sticks: ${parseResult.summary.totalMio.toLocaleString()} Million
• Total Cartons: ${parseResult.summary.totalCartons.toLocaleString()} cartons
• Tobacco Required: ${Math.round(parseResult.summary.totalTobaccoRequiredKg).toLocaleString()} kg
• Primary Batches: ${batches} batches (ROUNDUP)
• Click below to apply and reflect the schedule directly to the factory floor.`;
      }

      const agentMsg: ExtendedChatMessage = {
        id: `agent-file-${Date.now()}`,
        sender: 'agent',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        excelData: {
          summary: parseResult.summary,
          items: parseResult.items,
          applied: false,
        },
      };

      setMessages((prev) => [...prev, agentMsg]);

      eventBus.addEventLog({
        source: 'Task 11: AI Assistant',
        eventType: 'TOOL_EXECUTION',
        message: `Parsed Excel plan with ${parseResult.items.length} items (${parseResult.summary.totalMio} Mio sticks).`,
        status: 'success',
      });
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      const errorMsg: ExtendedChatMessage = {
        id: `agent-error-${Date.now()}`,
        sender: 'agent',
        text: isAr
          ? `❌ عذراً، حدث خطأ أثناء قراءة ملف الإكسل:\n${err?.message || 'تنسيق الملف غير صالح'}\n\nيمكنك تحميل النموذج القياسي الجاهز بالضغط على "تحميل نموذج إكسل".`
          : `❌ Error reading Excel file:\n${err?.message || 'Invalid spreadsheet structure'}\n\nYou can download the pre-formatted Excel template to verify expected columns.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsParsingExcel(false);
      setIsTyping(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Apply parsed Excel plan to factory
  const handleApplyExcelPlan = (msgId: string, items: SecondaryPlanItem[]) => {
    onApplyPlanUpdate(items);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.excelData) {
          return {
            ...m,
            excelData: { ...m.excelData, applied: true },
          };
        }
        return m;
      })
    );

    const totalMio = items.reduce((s, i) => s + i.targetMio, 0);
    const totalTobacco = items.reduce((s, i) => s + (i.tobaccoRequiredKg || 0), 0);
    const batches = Math.ceil(totalTobacco / constants.blendBatchSizeKg);

    const confirmMsg: ExtendedChatMessage = {
      id: `agent-applied-${Date.now()}`,
      sender: 'agent',
      text: isAr
        ? `✅ تم بنجاح عكس الخطة وتحديث بيانات المصنع بالكامل!
• تم تحديث خطة الإنتاج الثانوي بـ ${items.length} أصناف (${totalMio.toLocaleString()} مليون سيجارة).
• تم تحديث خطة الإنتاج الأولي تلقائياً إلى ${batches} دفعات (${(batches * constants.blendBatchSizeKg).toLocaleString()} كغم).
• تم تحديث لوحة التحكم الرئيسية ومخطط اتجاهات الإنتاج وجميع جداول الـ BOM ومحرك التعلّم التكيفي.`
        : `✅ Plan successfully reflected and applied to factory!
• Secondary production updated with ${items.length} SKUs (${totalMio.toLocaleString()} Million sticks).
• Primary production automatically updated to ${batches} batches (${(batches * constants.blendBatchSizeKg).toLocaleString()} kg).
• Main Dashboard trends, multi-stage BOM schedules, and adaptive learning are now synchronized.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, confirmMsg]);

    eventBus.addEventLog({
      source: 'Task 11: AI Assistant',
      eventType: 'USER_ACTION',
      message: `Reflected Excel plan to active factory state: ${items.length} SKUs, ${totalMio} Mio.`,
      status: 'success',
    });
  };

  // Autonomous Command Execution Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    if (text === 'رفع ملف إكسل' || text === 'Upload Excel') {
      fileInputRef.current?.click();
      return;
    }

    if (text === 'تحميل نموذج إكسل' || text === 'Download Excel Template') {
      excelService.downloadTemplate();
      const templateMsg: ExtendedChatMessage = {
        id: `agent-tmpl-${Date.now()}`,
        sender: 'agent',
        text: isAr
          ? '📥 تم تنزيل نموذج الإكسل القياسي (Cigarette_Production_Plan_Template.xlsx). يمكنك تعديل الكميات وإعادة رفع الملف هنا ليتم عكسها فوراً.'
          : '📥 Downloaded standard Excel template (Cigarette_Production_Plan_Template.xlsx). Edit your target quotas and upload it back here to reflect changes instantly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, templateMsg]);
      return;
    }

    const userMsg: ExtendedChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // 1. DIRECT LOCAL COMMAND EXECUTION VIA AGENT COMMAND EXECUTOR
      const agentContext: AgentContext = {
        planItems,
        constants,
        lines,
        blendComponents,
        actualRecords,
        language,
      };

      const executionResult = AgentCommandExecutor.executeCommand(text, agentContext);

      if (executionResult.hasCommand && executionResult.executed) {
        // Synchronize parent React states immediately!
        if (executionResult.updatedPlanItems) {
          onApplyPlanUpdate(executionResult.updatedPlanItems);
        }
        if (executionResult.updatedConstants && onUpdateConstants) {
          onUpdateConstants(executionResult.updatedConstants);
        }
        if (executionResult.updatedLines && onUpdateLines) {
          onUpdateLines(executionResult.updatedLines);
        }
        if (executionResult.updatedBlendComponents && onUpdateBlendComponents) {
          onUpdateBlendComponents(executionResult.updatedBlendComponents);
        }
        if (executionResult.targetTab && onNavigateTab) {
          onNavigateTab(executionResult.targetTab);
        }
        if (executionResult.loggedRecord && onAddActualRecord) {
          onAddActualRecord(executionResult.loggedRecord);
        }
        if (executionResult.actionType === 'RESET_DEFAULTS' && onResetDefaults) {
          onResetDefaults();
        }

        const agentMsg: ExtendedChatMessage = {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: isAr ? executionResult.detailsAr : executionResult.detailsEn,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          commandExecution: executionResult,
        };

        setMessages((prev) => [...prev, agentMsg]);
        setIsTyping(false);
        return;
      }

      // 2. CONVERSATIONAL REASONING VIA SERVER /API/CHAT
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
        skus: planItems.map((p) => `${p.skuCode}: ${p.targetMio}M (${p.packType || 'Hard'})`).join(', '),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: contextPayload,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.text || data.reply || (isAr ? 'تم استلام ومعالجة طلبك بنجاح.' : 'Your request was processed successfully.');

      // Check if server returned executable command action
      if (data.commandExecution) {
        const exec = data.commandExecution;
        if (exec.updatedPlanItems) onApplyPlanUpdate(exec.updatedPlanItems);
        if (exec.updatedConstants && onUpdateConstants) onUpdateConstants(exec.updatedConstants);
        if (exec.updatedLines && onUpdateLines) onUpdateLines(exec.updatedLines);
        if (exec.updatedBlendComponents && onUpdateBlendComponents) onUpdateBlendComponents(exec.updatedBlendComponents);
        if (exec.targetTab && onNavigateTab) onNavigateTab(exec.targetTab);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          commandExecution: data.commandExecution,
        },
      ]);
    } catch (err: any) {
      console.warn('Chat error fallback:', err);
      // High-precision local fallback response
      const totalDemandKg = planItems.reduce(
        (acc, it) =>
          acc +
          (it.tobaccoRequiredKg ??
            (it.targetMio * 1000000 * constants.tobaccoWeightPerStickG) / 1000),
        0
      );
      const batches = Math.ceil(totalDemandKg / constants.blendBatchSizeKg);
      const totalProduced = batches * constants.blendBatchSizeKg;
      const surplus = totalProduced - totalDemandKg;

      const fallbackText = isAr
        ? `حسابات الإنتاج الأولي الدقيقة:
• إجمالي التبغ المطلوب: ${totalDemandKg.toLocaleString()} كغم
• حجم الدفعة القياسي: ${constants.blendBatchSizeKg.toLocaleString()} كغم
• عدد الدفعات المطلوبة: ${batches} دفعات (تقريب للأعلى ROUNDUP)
• إجمالي ناتج التوليف: ${totalProduced.toLocaleString()} كغم
• فائض الصوامع (Surplus Buffer): ${surplus.toLocaleString()} كغم.

يمكنك إصدار أي أمر تنفيذي مباشر لتعديل الخطة أو رفع ملف إكسل وسأقوم بتطبيقه فوراً.`
        : `Primary Production Assessment:
• Total Cut Tobacco Demand: ${totalDemandKg.toLocaleString()} kg
• Standard Batch Size: ${constants.blendBatchSizeKg.toLocaleString()} kg
• Batches Required: ${batches} batches (ROUNDUP)
• Total Output: ${totalProduced.toLocaleString()} kg
• Silo Surplus: ${surplus.toLocaleString()} kg.

You can issue any command directly or upload an Excel spreadsheet to reflect changes instantly.`;

      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-' + Date.now(),
          sender: 'agent',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // If closed and not in full-screen mode, render floating launcher button
  if (!isOpen && !isFullScreenMode) {
    return (
      <button
        id="chat-assistant-floating-btn"
        onClick={onToggleOpen}
        className="fixed bottom-5 end-5 z-40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 p-3.5 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-all hover:scale-105 active:scale-95 group"
        title={isAr ? 'المساعد الذكي لتخطيط الإنتاج وتنفيذ الأوامر' : 'AI Production Assistant & Command Executor'}
      >
        <Bot className="w-6 h-6" />
        <span className="hidden sm:inline text-xs font-black pe-1">
          {isAr ? 'المساعد التنفيذي • إكسل' : 'AI Agent • Excel'}
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping absolute -top-1 -end-1" />
      </button>
    );
  }

  return (
    <div
      id="chat-assistant-container"
      className={
        isFullScreenMode
          ? 'w-full h-[calc(100vh-140px)] min-h-[580px] bg-slate-900 rounded-2xl border border-slate-700/90 shadow-2xl flex flex-col overflow-hidden relative'
          : `fixed z-50 transition-all duration-300 shadow-2xl border border-slate-700 bg-slate-900 rounded-2xl flex flex-col overflow-hidden ${
              isExpanded
                ? 'inset-3 sm:inset-8'
                : 'bottom-4 end-4 w-96 sm:w-[500px] h-[660px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]'
            }`
      }
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleProcessExcelFile(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleProcessExcelFile(e.target.files[0]);
          }
        }}
      />

      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'المساعد التنفيذي الذكي لتخطيط الإنتاج' : 'AI Production Execution Agent'}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'مُنفذ الأوامر نشط' : 'Executor Active'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isAr
                ? 'ينفذ الأوامر مباشرة داخل الوكيل • يقبل ملفات الإكسل • يعكس الخطط فوراً'
                : 'Direct in-agent command executor • Excel plan reflector • Real-time synchronization'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() =>
              setMessages([
                {
                  id: 'cleared',
                  sender: 'agent',
                  text: isAr ? 'تم مسح سجل المحادثة. كيف يمكنني مساعدتك؟' : 'Conversation cleared. How can I assist?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isAr ? 'مسح المحادثة' : 'Clear chat'}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {!isFullScreenMode && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
                title={isExpanded ? (isAr ? 'تصغير' : 'Collapse') : isAr ? 'توسيع' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onToggleOpen}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Agent Live Control Cockpit Sub-Bar */}
      <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCockpitOpen(!isCockpitOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 transition-all text-[11px]"
            title={isAr ? 'عرض لوحة قيادة تحكم الوكيل المباشر' : 'Toggle Agent Live Control Cockpit'}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'لوحة تحكم الوكيل المباشر' : 'Agent Direct Control Cockpit'}</span>
            {isCockpitOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>
              {agentNodes.filter((n) => n.status === 'Running').length > 0
                ? (isAr ? `${agentNodes.filter((n) => n.status === 'Running').length} عقدة نشطة الآن` : `${agentNodes.filter((n) => n.status === 'Running').length} Nodes Active`)
                : (isAr ? '10 عقد جاهزة للأوامر' : '10 Nodes Standby')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSendMessage(isAr ? 'شغل دورة الوكيل التخطيطية الشاملة' : 'Run full agent cycle')}
            className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isAr ? 'تشغيل دورة الوكيل' : 'Run Cycle'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Cockpit Panel */}
      {isCockpitOpen && (
        <div className="p-3 bg-slate-950/95 border-b border-slate-800 space-y-2.5 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              {isAr ? 'عقد الوكيل الذكي (التحكم والتوجيه المباشر):' : 'Agent Active Nodes (Direct Control & State Mutation):'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {agentNodes.length} {isAr ? 'عقد متصلة' : 'Connected Nodes'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
            {agentNodes.map((node) => {
              const isRunning = node.status === 'Running';
              const isPaused = node.isPaused;

              return (
                <div
                  key={node.id}
                  className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 transition-colors ${
                    isRunning
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      : isPaused
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isRunning
                          ? 'bg-emerald-400 animate-pulse'
                          : isPaused
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="truncate font-semibold font-mono">
                      {isAr ? node.nameAr : node.nameEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        eventBus.setNodeStatus(node.id, 'Running', 3000);
                        eventBus.addEventLog({
                          source: 'AI Assistant Cockpit',
                          eventType: 'USER_ACTION',
                          message: `Manual execution trigger sent to node ${node.id}.`,
                          status: 'info',
                        });
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title={isAr ? 'تشغيل العقدة فورياً' : 'Trigger Node'}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </button>
                    <button
                      onClick={() => eventBus.toggleNodePause(node.id)}
                      className={`p-1 rounded ${
                        isPaused
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={isPaused ? (isAr ? 'تنشيط العقدة' : 'Resume Node') : (isAr ? 'إيقاف مؤقت' : 'Pause Node')}
                    >
                      <Pause className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay Notice */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-slate-900/90 border-2 border-dashed border-amber-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
          <FileSpreadsheet className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
          <h4 className="text-base font-bold text-white mb-1">
            {isAr ? 'أفلت ملف الإكسل هنا للتحليل الفوري' : 'Drop Excel File Here for Instant Analysis'}
          </h4>
          <p className="text-xs text-slate-300">
            {isAr ? 'يدعم صيغ .xlsx و .xls و .csv لعكس الخطة على المصنع' : 'Supports .xlsx, .xls, and .csv to reflect onto factory lines'}
          </p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/80 text-xs">
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
                className={`max-w-[90%] rounded-2xl px-4 py-3 leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                    : 'bg-slate-800/95 text-slate-200 border border-slate-700/80 rounded-tl-none shadow-md'
                }`}
              >
                {/* Regular Message Text */}
                <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

                {/* Direct Command Execution Confirmation Badge & Card */}
                {m.commandExecution && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/30 space-y-2.5 bg-slate-950/90 p-3 rounded-xl border border-emerald-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                        <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>{isAr ? m.commandExecution.titleAr : m.commandExecution.titleEn}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                        {m.commandExecution.badgeText}
                      </span>
                    </div>

                    {/* Target Agent Node & Directive Details */}
                    <div className="flex flex-wrap items-center gap-2 py-1 px-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono">
                      <div className="flex items-center gap-1 text-cyan-300 font-semibold">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span>
                          {isAr
                            ? (m.commandExecution.targetNodeNameAr || m.commandExecution.targetNodeId || 'المنسق الرئيسي للوكيل')
                            : (m.commandExecution.targetNodeNameEn || m.commandExecution.targetNodeId || 'Planner Core')}
                        </span>
                      </div>

                      {m.commandExecution.agentDirective && (
                        <div className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <Terminal className="w-2.5 h-2.5 text-amber-400" />
                          <span>{m.commandExecution.agentDirective}</span>
                        </div>
                      )}

                      {m.commandExecution.latencyMs !== undefined && (
                        <span className="text-slate-400 ms-auto">
                          ⚡ {m.commandExecution.latencyMs}ms
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{isAr ? m.commandExecution.detailsAr : m.commandExecution.detailsEn}</span>
                    </div>

                    {/* Navigation shortcut button if tab was targeted */}
                    {m.commandExecution.targetTab && onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab(m.commandExecution!.targetTab!)}
                        className="w-full mt-1 py-1.5 px-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{isAr ? 'الانتقال للشاشة فوراً' : 'Switch to Tab Now'}</span>
                        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                      </button>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                      <span>{isAr ? 'تم التزامن وتحديث الـ State بنجاح' : 'Synchronized & State Updated'}</span>
                      <span className="text-emerald-400 font-semibold">100% Agent Controlled</span>
                    </div>
                  </div>
                )}

                {/* Interactive Excel Plan Result Card */}
                {m.excelData && (
                  <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-3 bg-slate-900/80 p-3 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>{m.excelData.summary.fileName}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {m.excelData.summary.totalItems} {isAr ? 'أصناف' : 'SKUs'}
                      </span>
                    </div>

                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">
                          {isAr ? 'إجمالي السجائر' : 'Total Sticks'}
                        </span>
                        <strong className="text-white font-mono">
                          {m.excelData.summary.totalMio.toLocaleString()} Mio
                        </strong>
                      </div>
                      <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">
                          {isAr ? 'إجمالي الكراتين' : 'Total Cartons'}
                        </span>
                        <strong className="text-cyan-300 font-mono">
                          {m.excelData.summary.totalCartons.toLocaleString()}
                        </strong>
                      </div>
                      <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">
                          {isAr ? 'التبغ المطلوب' : 'Tobacco Required'}
                        </span>
                        <strong className="text-amber-300 font-mono">
                          {Math.round(m.excelData.summary.totalTobaccoRequiredKg).toLocaleString()} kg
                        </strong>
                      </div>
                      <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">
                          {isAr ? 'دفعات الإنتاج الأولي' : 'Primary Batches'}
                        </span>
                        <strong className="text-emerald-400 font-mono">
                          {m.excelData.summary.primaryBatchesCount} {isAr ? 'دفعات' : 'Batches'}
                        </strong>
                      </div>
                      <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 col-span-2">
                        <span className="text-slate-400 block text-[9px]">
                          {isAr ? 'خطوط التجهيز' : 'Packaging Lines'}
                        </span>
                        <strong className="text-slate-200 font-mono text-[10px]">
                          {m.excelData.summary.linesUsed.join(', ') || 'LU#01, LU#02'}
                        </strong>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-slate-800 rounded-lg overflow-hidden max-h-32 overflow-y-auto text-[10px]">
                      <table className="w-full text-start">
                        <thead className="bg-slate-950 text-slate-400 sticky top-0">
                          <tr>
                            <th className="p-1 text-start">SKU</th>
                            <th className="p-1 text-start">{isAr ? 'المنتج' : 'Product'}</th>
                            <th className="p-1 text-end">{isAr ? 'الكمية (M)' : 'Mio'}</th>
                            <th className="p-1 text-end">Line</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {m.excelData.items.slice(0, 4).map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50">
                              <td className="p-1 font-mono font-bold text-amber-300">{it.skuCode}</td>
                              <td className="p-1 truncate max-w-[120px]">{it.skuName}</td>
                              <td className="p-1 text-end font-mono">{it.targetMio}M</td>
                              <td className="p-1 text-end font-mono text-cyan-400">{it.lineId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Primary Action Button: Apply and Reflect to Factory */}
                    <div className="pt-1 flex flex-col gap-1.5">
                      {m.excelData.applied ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{isAr ? 'تم عكس الخطة بنجاح على المصنع' : 'Plan Successfully Reflected to Factory'}</span>
                        </div>
                      ) : (
                        <button
                          id={`apply-excel-btn-${m.id}`}
                          onClick={() => handleApplyExcelPlan(m.id, m.excelData!.items)}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isAr
                              ? '⚡ عكس الخطة على المصنع وتحديث الإنتاج'
                              : '⚡ Apply & Reflect Plan to Factory Production'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

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

        {isParsingExcel && (
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-pulse">
            <FileSpreadsheet className="w-5 h-5 text-amber-400 animate-spin" />
            <span>
              {isAr
                ? 'جارِ قراءة وفحص ملف الإكسل واستخراج الأصناف...'
                : 'Reading and extracting SKUs from Excel file...'}
            </span>
          </div>
        )}

        {isTyping && !isParsingExcel && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] text-slate-400">
              {isAr ? 'الوكيل ينفذ الأمر ويحلل بيانات المصنع...' : 'Agent executing command & calculating matrices...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Executable Action Chips Toolbar */}
      <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-amber-400 font-bold shrink-0 flex items-center gap-1 text-[10px]">
          <Zap className="w-3 h-3 text-amber-400" />
          {isAr ? 'أوامر سريعة:' : 'Quick Actions:'}
        </span>
        {activeCommands.map((cmd, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(cmd.prompt)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors whitespace-nowrap active:scale-95"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Excel Upload & Download Toolbar */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            id="chat-upload-excel-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors text-[11px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'رفع ملف إكسل 📊' : 'Upload Excel 📊'}</span>
          </button>
          <button
            id="chat-download-template-btn"
            onClick={() => excelService.downloadTemplate()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors text-[11px]"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{isAr ? 'تحميل نموذج إكسل 📥' : 'Download Template 📥'}</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">
          {planItems.length} {isAr ? 'أصناف حالية' : 'active SKUs'}
        </span>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          id="chat-assistant-input"
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            isAr
              ? 'اكتب أمراً تنفيذياً (مثال: عدل كمية SKU-001 إلى 30 مليون أو ارفع إكسل)...'
              : 'Type an executive command (e.g. Set SKU-001 to 30 Mio or drop Excel)...'
          }
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          disabled={isTyping}
        />

        <button
          id="chat-assistant-send-btn"
          type="submit"
          disabled={isTyping || !inputMessage.trim()}
          className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 rounded-xl transition-all font-bold shrink-0"
          title={isAr ? 'إرسال الأمر' : 'Send command'}
        >
          <Send className="w-4 h-4 rtl:rotate-180" />
        </button>
      </form>
    </div>
  );
};
