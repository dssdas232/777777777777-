import React, { useState } from 'react';
import {
  FlaskConical,
  Droplets,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import {
  Language,
  CasingIngredient,
  TopFlavorIngredient,
} from '../types';
import { calculateSolutionBOM } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task6SolutionBOMProps {
  language: Language;
  batchSizeKg: number;
  batchesCount: number;
  casingRatePercent: number;
  topFlavorRatePercent: number;
  casingIngredients: CasingIngredient[];
  topFlavorIngredients: TopFlavorIngredient[];
  onUpdateCasingRate: (rate: number) => void;
  onUpdateTopFlavorRate: (rate: number) => void;
  onUpdateCasingIngredients: (ings: CasingIngredient[]) => void;
  onUpdateTopFlavorIngredients: (ings: TopFlavorIngredient[]) => void;
}

export const Task6SolutionBOM: React.FC<Task6SolutionBOMProps> = ({
  language,
  batchSizeKg,
  batchesCount,
  casingRatePercent,
  topFlavorRatePercent,
  casingIngredients,
  topFlavorIngredients,
  onUpdateCasingRate,
  onUpdateTopFlavorRate,
  onUpdateCasingIngredients,
  onUpdateTopFlavorIngredients,
}) => {
  const isAr = language === 'ar';

  const [casingRate, setCasingRate] = useState<number>(casingRatePercent || 10);
  const [topFlavorRate, setTopFlavorRate] = useState<number>(topFlavorRatePercent || 1.2);

  const { casing, topFlavor } = calculateSolutionBOM(
    batchSizeKg,
    batchesCount,
    casingRate,
    topFlavorRate,
    casingIngredients,
    topFlavorIngredients
  );

  const handleCasingRateChange = (rate: number) => {
    setCasingRate(rate);
    onUpdateCasingRate(rate);
    eventBus.setNodeStatus('task-6', 'Running', 1000);
    eventBus.addEventLog({
      source: 'Task 6: Solution BOM',
      eventType: 'TOOL_EXECUTION',
      message: `Casing application rate set to ${rate}%. Total casing: ${(batchSizeKg * (rate / 100)).toFixed(1)} kg/batch.`,
      status: 'success',
    });
  };

  const handleTopFlavorRateChange = (rate: number) => {
    setTopFlavorRate(rate);
    onUpdateTopFlavorRate(rate);
    eventBus.setNodeStatus('task-6', 'Running', 1000);
    eventBus.addEventLog({
      source: 'Task 6: Solution BOM',
      eventType: 'TOOL_EXECUTION',
      message: `Top-Flavor application rate set to ${rate}%. Total top-flavor: ${(batchSizeKg * (rate / 100)).toFixed(2)} kg/batch.`,
      status: 'success',
    });
  };

  const handleCasingIngChange = (id: string, newPct: number) => {
    const updated = casingIngredients.map((i) => (i.id === id ? { ...i, percentage: newPct } : i));
    onUpdateCasingIngredients(updated);
  };

  const handleTopFlavorIngChange = (id: string, newPct: number) => {
    const updated = topFlavorIngredients.map((i) => (i.id === id ? { ...i, percentage: newPct } : i));
    onUpdateTopFlavorIngredients(updated);
  };

  const exportSolutionToCSV = () => {
    const linesArr = [
      `Solution BOM Report (Batch: ${batchSizeKg} kg, Batches: ${batchesCount})`,
      '',
      `CASING SOLUTION (Application Rate: ${casingRate}%, Total/Batch: ${casing.totalPerBatchKg} kg, Total Plan: ${casing.totalPlanKg} kg)`,
      'Ingredient,Percentage %,Weight/Batch (kg),Total Plan (kg)',
      ...casing.items.map(
        (i) => `"${isAr ? i.nameAr : i.nameEn}",${i.percentage}%,${i.weightPerBatchKg},${i.totalPlanWeightKg}`
      ),
      '',
      `TOP-FLAVOR SOLUTION (Application Rate: ${topFlavorRate}%, Total/Batch: ${topFlavor.totalPerBatchKg} kg, Total Plan: ${topFlavor.totalPlanKg} kg)`,
      'Ingredient,Percentage %,Weight/Batch (kg),Total Plan (kg)',
      ...topFlavor.items.map(
        (i) => `"${isAr ? i.nameAr : i.nameEn}",${i.percentage}%,${i.weightPerBatchKg},${i.totalPlanWeightKg}`
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + linesArr.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Solution_BOM_${new Date().toISOString().slice(0, 10)}.csv`);
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
              {isAr ? 'المهمة 6: بوم المحاليل والنكهات (Solution BOM)' : 'Task 6: Solution BOM (Casing & Top-Flavor)'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {isAr ? 'الكيسنج والتوب فليفر' : 'Casing Sauce & Top Flavor'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تجهيز كميات المواد الكيميائية والمذيبات والنكهات لكل دفعة تبغ (10,000 كغم) وإجمالي الخطة'
              : 'Formulation of humectants, sugars, sauces, and volatile top aroma aromas per 10,000 kg batch'}
          </p>
        </div>

        <button
          onClick={exportSolutionToCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
        >
          <Download className="w-4 h-4" />
          <span>{isAr ? 'تصدير تقرير المحاليل' : 'Export Solution BOM'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Casing Solution */}
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="p-4 bg-slate-900/90 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? '1. محلول الكيسنج (Casing Solution)' : '1. Casing Sauce Solution'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'يطبق على تبغ البيرلي وأوراق التبغ لتحسين المرونة وتعديل الطعم' : 'Applied during lamina conditioning for moisture & burn control'}
                  </p>
                </div>
              </div>

              {/* Rate control */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">{isAr ? 'نسبة التطبيق:' : 'App. Rate:'}</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="25"
                  value={casingRate}
                  onChange={(e) => handleCasingRateChange(parseFloat(e.target.value) || 10)}
                  className="w-14 bg-slate-900 border border-amber-500/50 rounded text-xs font-bold text-center text-amber-300"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* Sub-KPIs */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-slate-400">{isAr ? 'إجمالي المحلول/دفعة:' : 'Casing / Batch:'}</span>
                <div className="text-base font-black text-amber-400 font-mono">
                  {casing.totalPerBatchKg.toLocaleString()} kg
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-slate-400">{isAr ? 'إجمالي الخطة الكلية:' : 'Total Plan Casing:'}</span>
                <div className="text-base font-black text-slate-100 font-mono">
                  {casing.totalPlanKg.toLocaleString()} kg
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/80 uppercase font-semibold">
                  <th className="p-2">{isAr ? 'المكون' : 'Ingredient'}</th>
                  <th className="p-2 text-amber-300">{isAr ? 'النسبة %' : 'Pct %'}</th>
                  <th className="p-2 text-cyan-300">{isAr ? 'كغم/دفعة' : 'kg/Batch'}</th>
                  <th className="p-2 text-emerald-300">{isAr ? 'إجمالي الخطة' : 'Total Plan'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {casing.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="p-2 font-medium text-slate-200">
                      {isAr ? item.nameAr : item.nameEn}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={item.percentage}
                        onChange={(e) => handleCasingIngChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs font-bold text-center text-amber-300"
                      />
                      <span className="text-[11px] text-slate-400 mr-1">%</span>
                    </td>
                    <td className="p-2 font-mono text-cyan-300 font-bold">{item.weightPerBatchKg} kg</td>
                    <td className="p-2 font-mono text-emerald-400 font-bold">{item.totalPlanWeightKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">{isAr ? 'مجموع نسب الكيسنج:' : 'Casing Sum:'}</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(casing.sumPercentage - 100) < 0.1 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {casing.sumPercentage}% / 100%
            </span>
          </div>
        </div>

        {/* Section 2: Top-Flavor Solution */}
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="p-4 bg-slate-900/90 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? '2. محلول النكهة العلوية (Top-Flavor Solution)' : '2. Top-Flavor Solution'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'يرش في نهاية خط الخلط قبل التعتيق لمنح النكهة والرائحة المميزة' : 'Sprayed onto final cut filler before silo resting for characteristic aroma'}
                  </p>
                </div>
              </div>

              {/* Rate control */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">{isAr ? 'نسبة التطبيق:' : 'App. Rate:'}</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={topFlavorRate}
                  onChange={(e) => handleTopFlavorRateChange(parseFloat(e.target.value) || 1.2)}
                  className="w-14 bg-slate-900 border border-teal-500/50 rounded text-xs font-bold text-center text-teal-300"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* Sub-KPIs */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-slate-400">{isAr ? 'إجمالي النكهة/دفعة:' : 'Top Flavor / Batch:'}</span>
                <div className="text-base font-black text-teal-400 font-mono">
                  {topFlavor.totalPerBatchKg.toLocaleString()} kg
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-slate-400">{isAr ? 'إجمالي الخطة الكلية:' : 'Total Plan Top Flavor:'}</span>
                <div className="text-base font-black text-slate-100 font-mono">
                  {topFlavor.totalPlanKg.toLocaleString()} kg
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/80 uppercase font-semibold">
                  <th className="p-2">{isAr ? 'المكون' : 'Ingredient'}</th>
                  <th className="p-2 text-teal-300">{isAr ? 'النسبة %' : 'Pct %'}</th>
                  <th className="p-2 text-cyan-300">{isAr ? 'كغم/دفعة' : 'kg/Batch'}</th>
                  <th className="p-2 text-emerald-300">{isAr ? 'إجمالي الخطة' : 'Total Plan'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {topFlavor.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="p-2 font-medium text-slate-200">
                      {isAr ? item.nameAr : item.nameEn}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={item.percentage}
                        onChange={(e) => handleTopFlavorIngChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs font-bold text-center text-teal-300"
                      />
                      <span className="text-[11px] text-slate-400 mr-1">%</span>
                    </td>
                    <td className="p-2 font-mono text-cyan-300 font-bold">{item.weightPerBatchKg} kg</td>
                    <td className="p-2 font-mono text-emerald-400 font-bold">{item.totalPlanWeightKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">{isAr ? 'مجموع نسب التوب فليفر:' : 'Top Flavor Sum:'}</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(topFlavor.sumPercentage - 100) < 0.1 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {topFlavor.sumPercentage}% / 100%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
