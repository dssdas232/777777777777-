import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  Language,
  ActualProductionRecord,
  ProductionLine,
  FactoryConstants,
  AdaptiveRecommendation,
} from '../types';
import { analyzeAdaptiveLearning } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task8AdaptiveLearningProps {
  language: Language;
  actualRecords: ActualProductionRecord[];
  lines: ProductionLine[];
  constants: FactoryConstants;
  onApplyRecommendation: (rec: AdaptiveRecommendation) => void;
}

export const Task8AdaptiveLearning: React.FC<Task8AdaptiveLearningProps> = ({
  language,
  actualRecords,
  lines,
  constants,
  onApplyRecommendation,
}) => {
  const isAr = language === 'ar';

  const [acceptedLineIds, setAcceptedLineIds] = useState<string[]>([]);
  const recommendations = analyzeAdaptiveLearning(actualRecords, lines, constants);

  const handleAccept = (rec: AdaptiveRecommendation) => {
    onApplyRecommendation(rec);
    setAcceptedLineIds([...acceptedLineIds, `${rec.lineId}_${rec.skuCode}`]);

    eventBus.setNodeStatus('engine', 'Running', 1200);
    eventBus.addEventLog({
      source: 'Task 8: Adaptive Engine',
      eventType: 'ADAPTIVE_LEARNING',
      message: `Adaptive calibration accepted: Line ${rec.lineId} efficiency tuned to ${rec.suggestedEfficiency}% (sample size: ${rec.sampleCount}).`,
      status: 'success',
      payload: rec,
    });
  };

  // Prepare Variance Evolution Chart Data (last 8 records)
  const chartRecords = [...actualRecords].reverse().slice(-10);
  const maxVar = 4; // -4% to +4% range
  const chartHeight = 160;
  const chartWidth = 600;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المهمة 8: محرك التعلّم التكيفي ومعايرة الافتراضات (Adaptive Learning)' : 'Task 8: Machine Adaptive Learning & Baseline Calibration'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {isAr ? 'تفعيل تلقائي بعد 5 عينات' : 'Active (>= 5 Sample Threshold)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تحليل الانحرافات المتراكمة واقتراح ضبط كفاءة الخطوط وأوزان التبغ بناءً على المتوسط الفعلي — مع زر قبول إلزامي للمستخدم'
              : 'Statistical variance clustering across production history with calibrated baselines requiring explicit human approval'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <BrainCircuit className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">
            {isAr ? `العينات المسجلة: ${actualRecords.length}` : `Samples: ${actualRecords.length}`}
          </span>
        </div>
      </div>

      {/* Adaptive Recommendations Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'التوصيات التكيفية المقترحة (Adaptive Proposals)' : 'Active Adaptive Proposals'}</span>
        </h3>

        {recommendations.length === 0 ? (
          <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">
              {isAr ? 'الانحرافات ضمن حدود التسامح المعيارية' : 'All Lines Within Baseline Tolerances'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isAr
                ? 'لا توجد انحرافات حرجة تتجاوز 1% للكفاءة أو 0.005 غم للوزن بعد تجميع 5 سجلات متتالية.'
                : 'No critical drift exceeding ±1% efficiency or ±0.005g weight detected after 5+ consecutive sample runs.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec) => {
              const line = lines.find((l) => l.id === rec.lineId);
              const key = `${rec.lineId}_${rec.skuCode}`;
              const isAccepted = acceptedLineIds.includes(key);

              return (
                <div
                  key={key}
                  className={`bg-slate-800/95 rounded-xl border p-5 shadow-xl transition-all ${
                    isAccepted
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-amber-500/50 ring-1 ring-amber-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {rec.skuCode}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {line?.name || rec.lineId}
                        </h4>
                        <span className="text-xs text-slate-400">
                          ({rec.sampleCount} {isAr ? 'سجلات فعلية سابقة' : 'historical samples'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-3xl">
                        {isAr ? rec.explanationAr : rec.explanationEn}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {isAccepted ? (
                        <span className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {isAr ? 'تم قبول وتحديث الافتراضات' : 'Baseline Accepted & Applied'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAccept(rec)}
                          className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isAr ? 'قبول التحديث (Accept)' : 'Accept Baseline Update'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Before vs After Metric Comparison Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/80 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-lg">
                      <span className="text-slate-400 block">{isAr ? 'الكفاءة الحالية:' : 'Current Efficiency:'}</span>
                      <span className="text-base font-bold text-slate-300">{rec.currentEfficiency}%</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-amber-500/40">
                      <span className="text-amber-400 block font-semibold">
                        {isAr ? 'الكفاءة المقترحة (الفعلي):' : 'Suggested Efficiency:'}
                      </span>
                      <span className="text-base font-bold text-amber-300">{rec.suggestedEfficiency}%</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg">
                      <span className="text-slate-400 block">{isAr ? 'وزن السيجارة المخطط:' : 'Planned Stick Weight:'}</span>
                      <span className="text-base font-bold text-slate-300">{rec.currentStickWeightG} g</span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-cyan-500/40">
                      <span className="text-cyan-400 block font-semibold">
                        {isAr ? 'متوسط الوزن الفعلي:' : 'Suggested Stick Weight:'}
                      </span>
                      <span className="text-base font-bold text-cyan-300">{rec.suggestedStickWeightG} g</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Variance Evolution Over Time (Interactive Visual Chart) */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {isAr ? 'رسم بياني لتطور الانحراف عبر الزمن (Variance Evolution Over Time)' : 'Variance Evolution Over Time (Historical Runs)'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'تتبع انحراف استهلاك التبغ الفعلي مقابل المخطط % مع حدود التسامح (±2%)'
                : 'Tracks actual tobacco variance% against baseline with upper/lower tolerance bands (±2%)'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> {isAr ? 'الهدف (0%)' : 'Target (0%)'}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> {isAr ? 'الفعلي' : 'Actual Run'}
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 border-t border-dashed border-rose-400 inline-block" /> {isAr ? 'حد التسامح (±2%)' : 'Tolerance (±2%)'}
            </span>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full overflow-x-auto bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible"
          >
            {/* Grid lines */}
            {/* +2% Tolerance */}
            <line
              x1="40"
              y1="40"
              x2={chartWidth - 20}
              y2="40"
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x="35" y="44" fill="#f43f5e" fontSize="10" textAnchor="end">
              +2%
            </text>

            {/* 0% Baseline */}
            <line
              x1="40"
              y1="80"
              x2={chartWidth - 20}
              y2="80"
              stroke="#10b981"
              strokeWidth="1.5"
            />
            <text x="35" y="84" fill="#10b981" fontSize="10" textAnchor="end">
              0%
            </text>

            {/* -2% Tolerance */}
            <line
              x1="40"
              y1="120"
              x2={chartWidth - 20}
              y2="120"
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x="35" y="124" fill="#f43f5e" fontSize="10" textAnchor="end">
              -2%
            </text>

            {/* Plot Points and Line */}
            {chartRecords.length > 1 && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                points={chartRecords
                  .map((rec, i) => {
                    const step = (chartWidth - 80) / (chartRecords.length - 1);
                    const x = 50 + i * step;
                    // Y calculation: 0% is at y=80. Each 1% is 20px.
                    const y = Math.max(15, Math.min(chartHeight - 15, 80 - rec.varianceTobaccoPercent * 20));
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* Render Nodes with labels */}
            {chartRecords.map((rec, i) => {
              const step = (chartWidth - 80) / Math.max(1, chartRecords.length - 1);
              const x = 50 + i * step;
              const y = Math.max(15, Math.min(chartHeight - 15, 80 - rec.varianceTobaccoPercent * 20));

              return (
                <g key={rec.id} className="cursor-pointer">
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="#1e293b"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={y - 8}
                    fill="#f59e0b"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {rec.varianceTobaccoPercent > 0 ? `+${rec.varianceTobaccoPercent}%` : `${rec.varianceTobaccoPercent}%`}
                  </text>
                  <text
                    x={x}
                    y={chartHeight - 5}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {rec.timestamp.slice(5, 10)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
