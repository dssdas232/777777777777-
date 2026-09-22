import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Factory,
  Cpu,
  Package,
  Boxes,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Database,
  ExternalLink,
  ChevronRight,
  Zap,
  Mic,
  Bot,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Language,
  SecondaryPlanItem,
  SecondaryPlanCalculatedItem,
  ProductionLine,
  FactoryConstants,
  BlendComponent,
  ActiveTab,
  ActualProductionRecord,
} from '../types';
import {
  calculateSecondaryPlanItem,
  calculateSecondaryTotals,
} from '../services/plannerEngine';
import { ProductionTrendsChart } from './ProductionTrendsChart';

interface MainDashboardProps {
  language: Language;
  planItems: SecondaryPlanItem[];
  productionLines: ProductionLine[];
  constants: FactoryConstants;
  blendComponents: BlendComponent[];
  actualRecords?: ActualProductionRecord[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenVoiceConversation?: () => void;
  onOpenChatAssistant?: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  language,
  planItems,
  productionLines,
  constants,
  blendComponents,
  actualRecords = [],
  onNavigateTab,
  onOpenVoiceConversation,
  onOpenChatAssistant,
}) => {
  const isAr = language === 'ar';
  const [filterLineId, setFilterLineId] = useState<string>('ALL');

  // 1. Calculate Secondary Production Totals
  const calculatedItems: SecondaryPlanCalculatedItem[] = planItems.map((item) =>
    calculateSecondaryPlanItem(item, constants)
  );
  const totals = calculateSecondaryTotals(calculatedItems);

  // Filter items if a specific Line Unit is selected
  const filteredItems =
    filterLineId === 'ALL'
      ? calculatedItems
      : calculatedItems.filter((item: SecondaryPlanCalculatedItem) => item.lineId === filterLineId);

  // 2. Calculate Primary Production Batches
  const batchSizeKg = constants.blendBatchSizeKg || 10000;
  const totalTobaccoDemandKg = totals.tobaccoRequiredKg;
  const totalBatchesCount = Math.max(1, Math.ceil(totalTobaccoDemandKg / batchSizeKg));
  const totalProducedKg = totalBatchesCount * batchSizeKg;
  const bufferSurplusKg = totalProducedKg - totalTobaccoDemandKg;

  // Build structured Batch details list
  const primaryBatches = Array.from({ length: totalBatchesCount }, (_, idx) => {
    const batchNum = idx + 1;
    const siloId = `Silo-0${(idx % 5) + 1}`;
    const shift = idx % 2 === 0 ? (isAr ? 'وردية صباحية A' : 'Shift A (Morning)') : (isAr ? 'وردية مسائية B' : 'Shift B (Evening)');
    const dayOffset = Math.floor(idx / 2) + 1;

    return {
      batchId: `BATCH-${String(batchNum).padStart(3, '0')}`,
      batchNumber: batchNum,
      batchNameAr: `دفعة خلطة التبغ الرئيسية #${batchNum} (توليفة 13 صنف)`,
      batchNameEn: `Primary Master Blend Run #${batchNum} (13-Grade Formulation)`,
      quantityProducedKg: batchSizeKg,
      targetSilo: siloId,
      shift,
      day: isAr ? `اليوم ${dayOffset}` : `Day ${dayOffset}`,
      status: idx === 0 ? 'Completed' : idx === 1 ? 'In_Progress' : 'Scheduled',
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/80 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                {isAr
                  ? 'لوحة التحكم الرئيسية للمصنع (Main Production Dashboard)'
                  : 'Cigarette Factory Main Production Dashboard'}
              </h1>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {isAr
                ? 'نظرة شاملة ومباشرة على الإنتاج الأولي (عدد الدفعات، الأسماء، والكميات المنتجة) والإنتاج الثانوي (رموز الأصناف SKU، الكميات المطلوبة، أرقام وأسماء خطوط التجهيز LU#).'
                : 'Unified operational cockpit displaying Primary Production batches & quantities alongside Secondary Production SKUs, demand quotas, and dedicated Line Units (LU#).'}
            </p>
          </div>

          {/* Quick factory health badge, Live Voice CTA & Excel Assistant CTA */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            {onOpenChatAssistant && (
              <button
                id="dashboard-open-assistant-btn"
                onClick={onOpenChatAssistant}
                className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs font-semibold text-emerald-300 transition-all flex items-center gap-2 shadow-lg group"
                title={isAr ? 'فتح المساعد الذكي وقارئ ملفات الإكسل' : 'Open AI Assistant & Excel Analyzer'}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="block font-bold text-white text-xs">
                    {isAr ? 'المساعد الذكي • إكسل' : 'AI Assistant • Excel'}
                  </span>
                  <span className="block text-[10px] text-emerald-400/90 font-mono">
                    {isAr ? 'تحليل وعكس الخطة' : 'Parse & Reflect'}
                  </span>
                </div>
              </button>
            )}

            {onOpenVoiceConversation && (
              <button
                id="dashboard-open-voice-btn"
                onClick={onOpenVoiceConversation}
                className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 rounded-xl px-4 py-2 text-xs font-semibold text-amber-300 transition-all flex items-center gap-2 shadow-lg group"
                title={isAr ? 'فتح المحادثة الصوتية الحية (gemini-3.8-live)' : 'Open Real-Time Voice Conversation (gemini-3.8-live)'}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Mic className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <span className="block font-bold text-white text-xs">
                    {isAr ? 'محادثة صوتية Live' : 'Live Voice Session'}
                  </span>
                  <span className="block text-[10px] text-amber-400/90 font-mono">
                    gemini-3.8-live
                  </span>
                </div>
              </button>
            )}

            <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs font-mono">
              <span className="text-slate-400 block text-[10px] uppercase">
                {isAr ? 'نظام الجدولة الموحد' : 'Orchestration Mode'}
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {isAr ? 'متزامن آنياً (Live Synchronized)' : 'Live Synchronized'}
              </span>
            </div>
          </div>
        </div>

        {/* Operational KPI Highlights Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-700/60">
          {/* Card 1: Total Secondary Target */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{isAr ? 'إجمالي السجائر المطلوبة' : 'Total Cigarettes Needed'}</span>
              <Boxes className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {totals.targetMio.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">
                {isAr ? 'مليون سيجارة' : 'Mio Sticks'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{totals.cartons.toLocaleString()} {isAr ? 'كرتونة' : 'ctns'}</span>
              <span>•</span>
              <span>{totals.packs.toLocaleString()} {isAr ? 'علبة' : 'packs'}</span>
            </div>
          </div>

          {/* Card 2: Total Cut Tobacco Required */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{isAr ? 'التبغ المفروم المطلوب' : 'Cut Tobacco Required'}</span>
              <Factory className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {Math.round(totals.tobaccoRequiredKg).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">kg</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isAr
                ? `بمعدل ${constants.tobaccoWeightPerStickG} غم للسيجارة`
                : `@ ${constants.tobaccoWeightPerStickG}g per cigarette`}
            </div>
          </div>

          {/* Card 3: Primary Batches */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{isAr ? 'عدد دفعات الأولي' : 'Primary Batches Needed'}</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {totalBatchesCount}{' '}
              <span className="text-xs font-normal text-slate-400">
                {isAr ? 'دفعات' : 'Batches'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {totalProducedKg.toLocaleString()} kg {isAr ? 'إنتاج' : 'output'}
              <span className="text-emerald-400 font-semibold ms-1">
                (+{Math.round(bufferSurplusKg).toLocaleString()} kg {isAr ? 'فائض' : 'buffer'})
              </span>
            </div>
          </div>

          {/* Card 4: Operating Lines & Hours */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{isAr ? 'خطوط التجهيز LU#' : 'Line Units (LU#)'}</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-extrabold text-purple-400 font-mono">
              {productionLines.length}{' '}
              <span className="text-xs font-normal text-slate-400">
                {isAr ? 'خطوط نشطة' : 'Active Units'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {totals.requiredHours.toFixed(1)} {isAr ? 'ساعة تشغيل مطلوبة' : 'total machine hrs'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. New Data Visualization Section: Recharts Actual vs. Planned Output Trends (Last 30 Days based on Task 7) */}
      <ProductionTrendsChart
        language={language}
        actualRecords={actualRecords}
        planItems={planItems}
        productionLines={productionLines}
        onNavigateTab={onNavigateTab}
      />

      {/* 3. Primary Production Section (الإنتاج الأولي: عدد الدفعات، الاسم، والكمية المنتجة) */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/70">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isAr ? '1. الإنتاج الأولي (Primary Production)' : '1. Primary Production Overview'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {totalBatchesCount} {isAr ? 'دفعات' : 'Batches'}
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isAr
                ? 'جدول الدفعات المجدولة مع رقم واسم الدفعة، الكمية المنتجة بالكيلوغرام، الصومعة المخصصة، والوردية.'
                : 'Batches schedule detailing batch number, formulation name, quantity produced (kg), allocated silo, and shift.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('task3')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>{isAr ? 'تفاصيل خطة الأولي' : 'Primary Plan View'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-amber-400" />
            </button>
            <button
              onClick={() => onNavigateTab('task4')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <span>{isAr ? 'فحص خلطة التبغ (13 صنف)' : 'Blend BOM (13 Grades)'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Batches Summary Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-400">{isAr ? 'حجم الدفعة المعيارية:' : 'Standard Batch Size:'}</span>
            <span className="font-mono font-bold text-white">{batchSizeKg.toLocaleString()} kg</span>
          </div>
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-400">{isAr ? 'إجمالي الكمية المنتجة:' : 'Total Quantity Produced:'}</span>
            <span className="font-mono font-bold text-emerald-400">{totalProducedKg.toLocaleString()} kg</span>
          </div>
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <span className="text-slate-400">{isAr ? 'فائض صوامع التعتيق:' : 'Aging Silo Buffer Surplus:'}</span>
            <span className="font-mono font-bold text-cyan-400">+{Math.round(bufferSurplusKg).toLocaleString()} kg</span>
          </div>
        </div>

        {/* Table of Batches */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/80 shadow">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                <th className="p-3 w-28">{isAr ? 'رقم الدفعة (Batch #)' : 'Batch #'}</th>
                <th className="p-3">{isAr ? 'اسم الدفعة ومواصفة الخلطة (Batch Name)' : 'Batch Name & Blend Spec'}</th>
                <th className="p-3 text-right rtl:text-left w-36">
                  {isAr ? 'الكمية المنتجة (kg)' : 'Quantity Produced'}
                </th>
                <th className="p-3 w-32">{isAr ? 'صومعة التوجيه' : 'Target Silo'}</th>
                <th className="p-3 w-36">{isAr ? 'الوردية المجدولة' : 'Scheduled Shift'}</th>
                <th className="p-3 w-28 text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {primaryBatches.map((b) => {
                const isCompleted = b.status === 'Completed';
                const isInProgress = b.status === 'In_Progress';

                return (
                  <tr key={b.batchId} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {b.batchId}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">
                        {isAr ? b.batchNameAr : b.batchNameEn}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {isAr ? 'توليفة خلطة أمريكية (30% FU, 20% BU, 10% OR, 10% RTL, 10% Stem, ...)' : 'American Blend Spec (30% FU, 20% BU, 10% OR, 10% RTL, 10% Stem, ...)'}
                      </div>
                    </td>
                    <td className="p-3 text-right rtl:text-left font-mono font-extrabold text-emerald-400 text-sm whitespace-nowrap">
                      {b.quantityProducedKg.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-400">kg</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                        {b.targetSilo}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div className="font-medium">{b.shift}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{b.day}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isInProgress
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-emerald-400' : isInProgress ? 'bg-amber-400' : 'bg-slate-500'
                          }`}
                        />
                        {isCompleted
                          ? (isAr ? 'مكتملة' : 'Completed')
                          : isInProgress
                          ? (isAr ? 'قيد الخلط' : 'In Progress')
                          : (isAr ? 'مجدولة' : 'Scheduled')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-bold text-white border-t border-slate-700 text-xs">
                <td className="p-3 font-mono" colSpan={2}>
                  {isAr ? 'إجمالي إنتاج الخلطة الأولية:' : 'Total Primary Blend Output:'} ({totalBatchesCount} {isAr ? 'دفعات' : 'batches'})
                </td>
                <td className="p-3 text-right rtl:text-left font-mono text-emerald-400 text-sm">
                  {totalProducedKg.toLocaleString()} kg
                </td>
                <td className="p-3 text-cyan-400 font-mono text-[11px]" colSpan={3}>
                  {isAr ? 'يغطي إجمالي الطلب (' : 'Covers Total Demand ('}
                  {Math.round(totalTobaccoDemandKg).toLocaleString()} kg) {isAr ? 'بفائض' : 'with surplus'} +{Math.round(bufferSurplusKg).toLocaleString()} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Secondary Production Section (الإنتاج الثانوي: SKU Code, Quantity Needed, LU#, LU Name) */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/70">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isAr ? '2. الإنتاج الثانوي (Secondary Production)' : '2. Secondary Production Overview'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {planItems.length} SKUs
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isAr
                ? 'جدول تفصيلي يوضح كود الصنف (SKU Code)، الكمية المطلوبة، ورقم واسم خط التجهيز (LU# / LU Name).'
                : 'Operational breakdown showing SKU Code, Quantity Needed (Target Mio, Cartons, Packs, Tobacco kg), LU#, and LU Name.'}
            </p>
          </div>

          {/* Line Unit filter & Jump to Task 1 button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">{isAr ? 'تصفية الخط:' : 'Filter Line:'}</span>
              <select
                value={filterLineId}
                onChange={(e) => setFilterLineId(e.target.value)}
                className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-800 text-white">
                  {isAr ? 'كافة الخطوط (All LU#)' : 'All LU#'}
                </option>
                {productionLines.map((line) => (
                  <option key={line.id} value={line.id} className="bg-slate-800 text-white">
                    {line.id.replace('LINE-', 'LU#')} - {line.name.split('(')[0]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => onNavigateTab('task1')}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1.5"
            >
              <span>{isAr ? 'تعديل خطة الثانوي' : 'Edit Secondary Plan'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
            <button
              onClick={() => onNavigateTab('task2')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>{isAr ? 'BOM مواد التغليف' : 'Packaging BOM'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Production Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/80 shadow">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                <th className="p-3 w-28">{isAr ? 'رمز الصنف (SKU Code)' : 'SKU Code'}</th>
                <th className="p-3">{isAr ? 'اسم الصنف والعبوة (SKU Name)' : 'SKU Name & Pack'}</th>
                <th className="p-3 text-right rtl:text-left w-36">
                  {isAr ? 'الكمية المطلوبة (Needed)' : 'Quantity Needed'}
                </th>
                <th className="p-3 text-right rtl:text-left w-32">
                  {isAr ? 'التبغ المطلوب (kg)' : 'Tobacco Req. (kg)'}
                </th>
                <th className="p-3 w-24 text-center">{isAr ? 'رقم الخط (LU#)' : 'LU#'}</th>
                <th className="p-3">{isAr ? 'اسم خط التجهيز (LU Name & Machinery)' : 'LU Name & Machinery Spec'}</th>
                <th className="p-3 text-right rtl:text-left w-28">{isAr ? 'زمن التشغيل' : 'Est. Hours'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {filteredItems.map((item: SecondaryPlanCalculatedItem) => {
                const line = productionLines.find((l) => l.id === item.lineId);
                const luNumber = item.lineId.replace('LINE-', 'LU#');
                const isHard = item.packType === 'Hard';

                return (
                  <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* SKU Code */}
                    <td className="p-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {item.skuCode}
                    </td>

                    {/* SKU Name & Pack Type */}
                    <td className="p-3">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{item.skuName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                            isHard
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {item.packType} Pack
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.cartons.toLocaleString()} {isAr ? 'كرتونة' : 'ctns'} •{' '}
                        {item.packs.toLocaleString()} {isAr ? 'علبة' : 'packs'}
                      </div>
                    </td>

                    {/* Quantity Needed (Target in Mio & Sticks) */}
                    <td className="p-3 text-right rtl:text-left whitespace-nowrap">
                      <div className="font-mono font-extrabold text-white text-sm">
                        {item.targetMio.toFixed(1)}{' '}
                        <span className="text-[11px] font-normal text-slate-400">
                          {isAr ? 'مليون' : 'Mio'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.sticks.toLocaleString()} {isAr ? 'سيجارة' : 'sticks'}
                      </div>
                    </td>

                    {/* Tobacco Required in kg */}
                    <td className="p-3 text-right rtl:text-left font-mono font-bold text-amber-400 text-sm whitespace-nowrap">
                      {Math.round(item.tobaccoRequiredKg).toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-400">kg</span>
                    </td>

                    {/* LU# (Line Unit Number) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono font-extrabold text-xs">
                        {luNumber}
                      </span>
                    </td>

                    {/* LU Name */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">
                        {line?.name || item.lineId}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {line?.speedSticksPerMin.toLocaleString()} {isAr ? 'سيجارة/دقيقة' : 'cigs/min'} •{' '}
                        {item.efficiencyPercent}% {isAr ? 'كفاءة' : 'eff'}
                      </div>
                    </td>

                    {/* Hours */}
                    <td className="p-3 text-right rtl:text-left font-mono text-slate-300 whitespace-nowrap">
                      <div className="font-bold text-white">
                        {item.requiredHours.toFixed(1)} h
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ~{item.requiredDays.toFixed(1)} {isAr ? 'يوم عمل' : 'days'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-bold text-white border-t border-slate-700 text-xs">
                <td className="p-3 font-mono" colSpan={2}>
                  {isAr ? 'إجمالي الخطة الثانوية:' : 'Total Secondary Production Plan:'} ({filteredItems.length} SKUs)
                </td>
                <td className="p-3 text-right rtl:text-left font-mono text-cyan-400 text-sm">
                  {totals.targetMio.toFixed(1)} Mio
                </td>
                <td className="p-3 text-right rtl:text-left font-mono text-amber-400 text-sm">
                  {Math.round(totals.tobaccoRequiredKg).toLocaleString()} kg
                </td>
                <td className="p-3 text-center font-mono text-purple-300">
                  {productionLines.length} LUs
                </td>
                <td className="p-3 text-slate-400 font-mono text-[11px]" colSpan={2}>
                  {totals.requiredHours.toFixed(1)} {isAr ? 'ساعات تشغيل كلية' : 'total machine hours required'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
