import React, { useState } from 'react';
import {
  Combine,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  Language,
  BlendComponent,
  BlendGrade,
} from '../types';
import { calculateBlendBOM } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task4BlendBOMProps {
  language: Language;
  components: BlendComponent[];
  batchSizeKg: number;
  batchesCount: number;
  onUpdateComponents: (components: BlendComponent[]) => void;
}

export const Task4BlendBOM: React.FC<Task4BlendBOMProps> = ({
  language,
  components,
  batchSizeKg,
  batchesCount,
  onUpdateComponents,
}) => {
  const isAr = language === 'ar';
  const [localList, setLocalList] = useState<BlendComponent[]>(components);

  const { items, totalPercentage, isBalanced, totalBatchWeightKg, totalPlanWeightKg } =
    calculateBlendBOM(localList, batchSizeKg, batchesCount);

  const handlePercentageChange = (code: BlendGrade, newPct: number) => {
    const updated = localList.map((c) => {
      if (c.code === code) {
        return { ...c, percentage: newPct };
      }
      return c;
    });
    setLocalList(updated);
    onUpdateComponents(updated);

    eventBus.setNodeStatus('task-4', 'Running', 1000);
    eventBus.addEventLog({
      source: 'Task 4: Blend BOM',
      eventType: 'TOOL_EXECUTION',
      message: `Blend ratio adjusted for grade ${code} (${newPct}%). Total blend: ${updated.reduce((s, i) => s + i.percentage, 0)}%.`,
      status: Math.abs(updated.reduce((s, i) => s + i.percentage, 0) - 100) < 0.01 ? 'success' : 'warning',
    });
  };

  // Auto-normalize to 100% helper
  const handleAutoNormalize = () => {
    const currentSum = localList.reduce((s, c) => s + c.percentage, 0);
    if (currentSum === 0) return;

    const normalized = localList.map((c) => ({
      ...c,
      percentage: Number(((c.percentage / currentSum) * 100).toFixed(2)),
    }));

    // Adjust residual rounding on first item
    const normSum = normalized.reduce((s, c) => s + c.percentage, 0);
    const diff = Number((100 - normSum).toFixed(2));
    if (Math.abs(diff) > 0.001 && normalized.length > 0) {
      normalized[0].percentage = Number((normalized[0].percentage + diff).toFixed(2));
    }

    setLocalList(normalized);
    onUpdateComponents(normalized);
  };

  const exportBlendToCSV = () => {
    const headers = ['Grade Code', 'Grade Description', 'Percentage %', 'Weight Per Batch (kg)', 'Total Plan Weight (kg)'];
    const rows = items.map((i) => [
      i.code,
      `"${isAr ? i.nameAr : i.nameEn}"`,
      i.percentage,
      i.weightPerBatchKg,
      i.totalWeightForPlanKg,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        `Blend BOM Formulation (Batch Size: ${batchSizeKg} kg, Batches: ${batchesCount})`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `TOTAL,ALL 13 GRADES,${totalPercentage}%,${totalBatchWeightKg} kg,${totalPlanWeightKg} kg`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Blend_BOM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المهمة 4: بوم خلطة التبغ (Blend BOM Formulation)' : 'Task 4: Tobacco Blend BOM (13 Components)'}
            </h2>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                isBalanced
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}
            >
              {isBalanced
                ? isAr
                  ? 'متزن: 100%'
                  : 'Balanced: 100%'
                : isAr
                ? `خلل في المجموع: ${totalPercentage}%`
                : `Imbalance: ${totalPercentage}%`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'الدرجات الـ 13 القياسية: BU, FU, OR, CL, RE, IS, SL, ET, TL, 12*, 10*, LD, DB مع حساب الوزن لكل دفعة وإجمالي الخطة'
              : 'The 13 standard blend leaf grades with strict 100% mathematical integrity validation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isBalanced && (
            <button
              onClick={handleAutoNormalize}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
            >
              <Sliders className="w-4 h-4" />
              <span>{isAr ? 'ضبط تلقائي لـ 100%' : 'Auto-Normalize to 100%'}</span>
            </button>
          )}

          <button
            onClick={exportBlendToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير BOM' : 'Export BOM'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Warning Banner if Sum != 100% */}
      {!isBalanced && (
        <div className="bg-rose-950/70 border-2 border-rose-500/80 p-4 rounded-xl flex items-start gap-3 text-rose-200 shadow-xl animate-bounce">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-rose-300">
              {isAr
                ? `تحذير: مجموع نسب الخلطة الحالي = ${totalPercentage}% (المطلوب 100% تماماً)`
                : `Warning: Current Blend Total = ${totalPercentage}% (Must equal exactly 100%)`}
            </h4>
            <p className="text-rose-300/80">
              {isAr
                ? `يوجد انحراف قدره ${Math.abs(totalPercentage - 100).toFixed(2)}% (${
                    totalPercentage > 100 ? 'زيادة' : 'نقص'
                  }). اضبط النسب أو انقر "ضبط تلقائي لـ 100%" لضمان تجانس الخصائص الكيميائية والفيزيائية للسيجارة.`
                : `Discrepancy of ${Math.abs(totalPercentage - 100).toFixed(2)}% detected (${
                    totalPercentage > 100 ? 'Over' : 'Under'
                  }). Adjust percentage inputs or use Auto-Normalize.`}
            </p>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="text-xs text-slate-400">{isAr ? 'حجم الدفعة المعتمد' : 'Batch Size Basis'}</div>
          <div className="text-xl font-black text-amber-400 mt-0.5">
            {batchSizeKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {batchesCount} {isAr ? 'دفعات مقررة' : 'planned batches'}
          </div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="text-xs text-slate-400">{isAr ? 'الوزن الفعلي لكل دفعة' : 'Calculated Weight / Batch'}</div>
          <div className="text-xl font-black text-white mt-0.5">
            {totalBatchWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isBalanced ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {isAr ? 'مطابق لسعة الخلاط تماماً' : 'Matches mixer capacity'}
              </span>
            ) : (
              <span className="text-rose-400">{isAr ? 'غير متزن' : 'Weight imbalance'}</span>
            )}
          </div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="text-xs text-slate-400">{isAr ? 'إجمالي وزن الخطة الكلية' : 'Total Plan Blend Volume'}</div>
          <div className="text-xl font-black text-cyan-400 mt-0.5">
            {totalPlanWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isAr ? 'لكل الدفعات المجدولة' : 'Across all scheduled batches'}
          </div>
        </div>
      </div>

      {/* Visual Component Stack Bar */}
      <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            {isAr ? 'التوزيع النسبي للخلطة (Blend Profile)' : 'Blend Composition Spectrum'}
          </span>
          <span className={`font-mono font-bold ${isBalanced ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPercentage}% / 100%
          </span>
        </div>
        <div className="w-full h-6 rounded-lg bg-slate-900 flex overflow-hidden border border-slate-700">
          {items.map((it, idx) => {
            const colors = [
              'bg-amber-600',
              'bg-amber-500',
              'bg-orange-500',
              'bg-yellow-600',
              'bg-emerald-600',
              'bg-teal-600',
              'bg-cyan-600',
              'bg-blue-600',
              'bg-indigo-600',
              'bg-purple-600',
              'bg-fuchsia-600',
              'bg-pink-600',
              'bg-rose-700',
            ];
            return (
              <div
                key={it.code}
                className={`${colors[idx % colors.length]} h-full transition-all flex items-center justify-center text-[10px] font-bold text-white overflow-hidden`}
                style={{ width: `${Math.max(0, it.percentage)}%` }}
                title={`${it.code}: ${it.percentage}%`}
              >
                {it.percentage >= 4 ? it.code : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Editable 13 Grades Table */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700 text-xs uppercase font-semibold">
                <th className="p-3">{isAr ? 'رمز الدرجة' : 'Grade'}</th>
                <th className="p-3">{isAr ? 'نوع ورقة التبغ ومواصفاتها' : 'Tobacco Type & Grade Name'}</th>
                <th className="p-3 text-amber-300">{isAr ? 'النسبة المئوية (%)' : 'Blend Ratio (%)'}</th>
                <th className="p-3 text-cyan-300">{isAr ? 'الوزن لكل دفعة (كغم)' : 'Weight / Batch (kg)'}</th>
                <th className="p-3 text-emerald-300">
                  {isAr ? `إجمالي الخطة (${batchesCount} دفعات)` : `Plan Total (${batchesCount} Batches)`}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {items.map((comp) => (
                <tr key={comp.code} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono font-extrabold text-amber-400 text-sm">{comp.code}</td>
                  <td className="p-3">
                    <span className="font-medium text-slate-200">{isAr ? comp.nameAr : comp.nameEn}</span>
                    {['IS', 'SL'].includes(comp.code) && (
                      <span className="mr-2 rtl:mr-0 rtl:ml-2 px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {isAr ? 'مُغذي لمهمة 5 (Stem BOM)' : 'Feeds Task 5 Stem'}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={comp.percentage}
                        onChange={(e) => handlePercentageChange(comp.code, parseFloat(e.target.value) || 0)}
                        className="bg-slate-900 border border-amber-500/60 rounded px-2.5 py-1 text-xs font-bold text-amber-300 w-20 focus:border-amber-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-cyan-300">
                    {comp.weightPerBatchKg.toLocaleString()} kg
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {comp.totalWeightForPlanKg.toLocaleString()} kg
                  </td>
                </tr>
              ))}

              {/* Total Balance Row */}
              <tr className="bg-slate-950/90 font-bold border-t-2 border-amber-500/50 text-white">
                <td className="p-3 text-amber-400">TOTAL</td>
                <td className="p-3 text-slate-300">{isAr ? 'مجموع الـ 13 درجة' : 'Sum of 13 Blend Components'}</td>
                <td className="p-3">
                  <span
                    className={`font-mono font-extrabold text-base ${
                      isBalanced ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                    }`}
                  >
                    {totalPercentage}%
                  </span>
                </td>
                <td className="p-3 text-cyan-300 font-extrabold text-base">
                  {totalBatchWeightKg.toLocaleString()} kg
                </td>
                <td className="p-3 text-emerald-400 font-extrabold text-base">
                  {totalPlanWeightKg.toLocaleString()} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
