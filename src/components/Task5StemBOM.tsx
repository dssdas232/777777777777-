import React, { useState } from 'react';
import {
  GitMerge,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Percent,
  Sliders,
  Download,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  Language,
  BlendComponent,
  StemStage,
} from '../types';
import { calculateStemBOM } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task5StemBOMProps {
  language: Language;
  blendComponents: BlendComponent[];
  batchSizeKg: number;
  batchesCount: number;
  stemStages: StemStage[];
  defaultStemYield: number;
  onUpdateStemStages: (stages: StemStage[]) => void;
  onUpdateStemYield: (yieldPct: number) => void;
}

export const Task5StemBOM: React.FC<Task5StemBOMProps> = ({
  language,
  blendComponents,
  batchSizeKg,
  batchesCount,
  stemStages,
  defaultStemYield,
  onUpdateStemStages,
  onUpdateStemYield,
}) => {
  const isAr = language === 'ar';

  // Extract IS and SL percentages from Blend BOM
  const isComp = blendComponents.find((c) => c.code === 'IS');
  const slComp = blendComponents.find((c) => c.code === 'SL');
  const isPct = isComp ? isComp.percentage : 6;
  const slPct = slComp ? slComp.percentage : 4;
  const stemTotalPct = isPct + slPct; // e.g. 10%

  const computedTargetStemKg = (stemTotalPct / 100) * batchSizeKg * batchesCount;

  const [yieldPercent, setYieldPercent] = useState<number>(defaultStemYield || 90);
  const [useCustomTarget, setUseCustomTarget] = useState<boolean>(false);
  const [customTargetKg, setCustomTargetKg] = useState<number>(computedTargetStemKg || 4000);

  const effectiveTargetStemKg = useCustomTarget ? customTargetKg : computedTargetStemKg;

  const {
    rawStemRequiredKg,
    calculatedStages,
    finalOutputKg,
    varianceFromTargetKg,
  } = calculateStemBOM(effectiveTargetStemKg, yieldPercent, stemStages);

  const handleYieldChange = (val: number) => {
    setYieldPercent(val);
    onUpdateStemYield(val);
    eventBus.setNodeStatus('task-5', 'Running', 1000);
    eventBus.addEventLog({
      source: 'Task 5: Stem BOM',
      eventType: 'TOOL_EXECUTION',
      message: `Stem target yield updated to ${val}%. Raw stem required: ${(effectiveTargetStemKg / (val / 100)).toFixed(1)} kg.`,
      status: 'success',
    });
  };

  const handleStagePercentChange = (stageId: string, newFactor: number) => {
    const updated = stemStages.map((st) => (st.id === stageId ? { ...st, weightChangePercent: newFactor } : st));
    onUpdateStemStages(updated);
    eventBus.setNodeStatus('task-5', 'Running', 800);
  };

  const exportStemToCSV = () => {
    const headers = ['Stage Name', 'Weight Factor %', 'Start Weight (kg)', 'Delta (kg)', 'End Weight (kg)', 'Yield %'];
    const rows = calculatedStages.map((cs) => [
      `"${isAr ? cs.stage.nameAr : cs.stage.nameEn}"`,
      cs.stage.weightChangePercent,
      cs.startWeightKg,
      cs.deltaWeightKg,
      cs.endWeightKg,
      `${cs.cumulativeYieldPercent}%`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        `Stem Mass-Balance BOM (Target Stem: ${effectiveTargetStemKg} kg, Yield: ${yieldPercent}%, Raw Stem Required: ${rawStemRequiredKg} kg)`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stem_BOM_${new Date().toISOString().slice(0, 10)}.csv`);
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
              {isAr ? 'المهمة 5: بوم معالجة وتمديد السيقان (Stem BOM & Yield)' : 'Task 5: Stem BOM & Multi-Stage Yield'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {isAr ? 'تتبع متسلسل للكتلة المادية' : 'Sequential Mass Balance'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? `السيقان المستهدفة = IS (${isPct}%) + SL (${slPct}%) من المهمة 4 = ${stemTotalPct}% من خلطة التبغ`
              : `Target Stem = IS (${isPct}%) + SL (${slPct}%) from Task 4 Blend = ${stemTotalPct}% total blend basis`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportStemToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير BOM السيقان' : 'Export Stem BOM'}</span>
          </button>
        </div>
      </div>

      {/* Target & Yield Tuning Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
        {/* Stem Target Source */}
        <div>
          <div className="text-xs text-slate-400 mb-1">{isAr ? 'السيقان المستهدفة (Target Stem)' : 'Target Stem (IS + SL)'}</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-400">
              {effectiveTargetStemKg.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">kg</span>
            </span>
            <button
              onClick={() => setUseCustomTarget(!useCustomTarget)}
              className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              {useCustomTarget ? (isAr ? 'إلغاء المخصص' : 'Reset') : (isAr ? 'تعديل يدوي' : 'Custom')}
            </button>
          </div>
          {useCustomTarget && (
            <input
              type="number"
              value={customTargetKg}
              onChange={(e) => setCustomTargetKg(parseFloat(e.target.value) || 0)}
              className="mt-2 w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
            />
          )}
          <div className="text-[11px] text-slate-500 mt-1">
            {isAr ? `مشتق من خلطة الـ ${batchSizeKg.toLocaleString()} كغم` : `From ${batchSizeKg.toLocaleString()} kg batch`}
          </div>
        </div>

        {/* Stem Yield Slider */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{isAr ? 'عائد السيقان الإجمالي (Yield %)' : 'Target Stem Yield %'}</span>
            <span className="font-mono font-bold text-purple-300 text-sm">{yieldPercent}%</span>
          </div>
          <input
            type="range"
            min="70"
            max="98"
            step="0.5"
            value={yieldPercent}
            onChange={(e) => handleYieldChange(parseFloat(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>70% (Loss heavy)</span>
            <span>90% (Standard)</span>
            <span>98% (High yield)</span>
          </div>
        </div>

        {/* Raw Stem Required */}
        <div className="bg-slate-900/90 p-3 rounded-lg border border-purple-500/40">
          <div className="text-xs text-purple-300 font-semibold">{isAr ? 'السيقان الخام المطلوبة (Raw Stem)' : 'Raw Stem Required Input'}</div>
          <div className="text-2xl font-black text-white mt-1">
            {rawStemRequiredKg.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            = {effectiveTargetStemKg.toLocaleString()} / ({yieldPercent}%)
          </div>
        </div>
      </div>

      {/* Sequential 5-Stage Pipeline Flowcards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {isAr ? 'المراحل المتسلسلة لخط معالجة السيقان (Sequential Mass Balance)' : 'Sequential Stem Processing Stages'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {calculatedStages.map((cs, idx) => {
            const isLoss = cs.stage.weightChangePercent < 0;
            const isGain = cs.stage.weightChangePercent > 0;

            return (
              <div
                key={cs.stage.id}
                className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 flex flex-col justify-between shadow-md relative"
              >
                {/* Stage number */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      value={cs.stage.weightChangePercent}
                      onChange={(e) =>
                        handleStagePercentChange(cs.stage.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-12 bg-slate-900 border border-slate-600 rounded text-[11px] font-bold text-center text-white"
                    />
                    <span className="text-[11px] text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">
                    {isAr ? cs.stage.nameAr : cs.stage.nameEn}
                  </h4>
                  <p className="text-[10px] text-slate-400 mb-2 line-clamp-2">
                    {isAr ? cs.stage.descriptionAr : cs.stage.descriptionEn}
                  </p>
                </div>

                {/* Weight transition */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-700/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>{isAr ? 'الدخول:' : 'In:'}</span>
                    <span className="font-mono text-slate-200">{cs.startWeightKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{isAr ? 'التغير:' : 'Delta:'}</span>
                    <span
                      className={`font-mono font-bold flex items-center gap-0.5 ${
                        isLoss ? 'text-rose-400' : isGain ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {isLoss ? <TrendingDown className="w-3 h-3" /> : isGain ? <TrendingUp className="w-3 h-3" /> : null}
                      {cs.deltaWeightKg > 0 ? `+${cs.deltaWeightKg}` : cs.deltaWeightKg} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-bold border-t border-slate-800 pt-1">
                    <span>{isAr ? 'الخروج:' : 'Out:'}</span>
                    <span className="font-mono text-purple-300">{cs.endWeightKg.toLocaleString()} kg</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 mt-2 text-center font-mono">
                  {isAr ? 'عائد تراكمي:' : 'Cum. Yield:'} {cs.cumulativeYieldPercent}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Output Validation Bar */}
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400">{isAr ? 'الناتج النهائي لمعالجة السيقان' : 'Final Processed Stem Output'}</div>
            <div className="text-xl font-extrabold text-white">
              {finalOutputKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
            </div>
          </div>
        </div>

        <div className="text-right rtl:text-left text-xs text-slate-400">
          <div>
            {isAr ? 'الانحراف عن المستهدف:' : 'Variance from Target:'}{' '}
            <span
              className={`font-mono font-bold ${
                Math.abs(varianceFromTargetKg) < 5 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {varianceFromTargetKg >= 0 ? `+${varianceFromTargetKg}` : varianceFromTargetKg} kg
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {isAr ? 'جاهز للتغذية والخلط في السيلو الرئيسي' : 'Ready for blending with primary lamina strips'}
          </div>
        </div>
      </div>
    </div>
  );
};
