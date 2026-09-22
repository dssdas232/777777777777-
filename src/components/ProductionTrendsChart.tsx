import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  LineChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  Language,
  ActualProductionRecord,
  SecondaryPlanItem,
  ProductionLine,
  ActiveTab,
} from '../types';

interface ProductionTrendsChartProps {
  language: Language;
  actualRecords: ActualProductionRecord[];
  planItems?: SecondaryPlanItem[];
  productionLines?: ProductionLine[];
  onNavigateTab?: (tab: ActiveTab) => void;
}

type ViewMode = 'daily' | 'cumulative' | 'variance' | 'efficiency';

export const ProductionTrendsChart: React.FC<ProductionTrendsChartProps> = ({
  language,
  actualRecords,
  planItems = [],
  productionLines = [],
  onNavigateTab,
}) => {
  const isAr = language === 'ar';

  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedSku, setSelectedSku] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');

  // Filter records by selected SKU and Line
  const filteredRecords = useMemo(() => {
    return actualRecords.filter((rec) => {
      if (selectedSku !== 'ALL' && rec.skuCode !== selectedSku) return false;
      if (selectedLine !== 'ALL' && rec.lineId !== selectedLine) return false;
      return true;
    });
  }, [actualRecords, selectedSku, selectedLine]);

  // Aggregate and sort records chronologically for the last 30 days
  const chartData = useMemo(() => {
    // Sort ascending by timestamp
    const sorted = [...filteredRecords].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Take the last 30 records (or all if <= 30)
    const last30 = sorted.slice(-30);

    let runningPlanned = 0;
    let runningActual = 0;

    return last30.map((r, idx) => {
      runningPlanned += r.plannedTargetMio;
      runningActual += r.actualProducedMio;

      const dateStr = r.timestamp.split(' ')[0] || r.timestamp;
      // Format date for display: MM-DD or short month
      const parts = dateStr.split('-');
      const shortDate = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr;

      const outputVariancePercent =
        r.plannedTargetMio > 0
          ? ((r.actualProducedMio - r.plannedTargetMio) / r.plannedTargetMio) * 100
          : 0;

      const adherencePercent =
        r.plannedTargetMio > 0 ? (r.actualProducedMio / r.plannedTargetMio) * 100 : 100;

      return {
        id: r.id,
        rawTimestamp: r.timestamp,
        date: shortDate,
        fullDate: dateStr,
        skuCode: r.skuCode,
        lineId: r.lineId,
        plannedMio: Number(r.plannedTargetMio.toFixed(2)),
        actualMio: Number(r.actualProducedMio.toFixed(2)),
        deltaMio: Number((r.actualProducedMio - r.plannedTargetMio).toFixed(2)),
        variancePercent: Number(outputVariancePercent.toFixed(2)),
        adherencePercent: Number(adherencePercent.toFixed(1)),
        cumulativePlannedMio: Number(runningPlanned.toFixed(2)),
        cumulativeActualMio: Number(runningActual.toFixed(2)),
        plannedEfficiency: r.plannedEfficiency,
        actualEfficiency: r.actualEfficiency,
        notes: r.notes || '',
        index: idx + 1,
      };
    });
  }, [filteredRecords]);

  // Aggregate Summary Statistics over the displayed 30-day window
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalPlannedMio: 0,
        totalActualMio: 0,
        netDeltaMio: 0,
        overallAdherence: 100,
        avgDailyVariance: 0,
        positiveDays: 0,
        negativeDays: 0,
        avgEfficiency: 0,
      };
    }

    const totalPlanned = chartData.reduce((acc, d) => acc + d.plannedMio, 0);
    const totalActual = chartData.reduce((acc, d) => acc + d.actualMio, 0);
    const netDelta = totalActual - totalPlanned;
    const adherence = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 100;
    const sumVariance = chartData.reduce((acc, d) => acc + d.variancePercent, 0);
    const avgVariance = sumVariance / chartData.length;
    const positive = chartData.filter((d) => d.variancePercent >= 0).length;
    const negative = chartData.filter((d) => d.variancePercent < 0).length;
    const avgEff =
      chartData.reduce((acc, d) => acc + d.actualEfficiency, 0) / chartData.length;

    return {
      totalPlannedMio: Number(totalPlanned.toFixed(1)),
      totalActualMio: Number(totalActual.toFixed(1)),
      netDeltaMio: Number(netDelta.toFixed(1)),
      overallAdherence: Number(adherence.toFixed(1)),
      avgDailyVariance: Number(avgVariance.toFixed(2)),
      positiveDays: positive,
      negativeDays: negative,
      avgEfficiency: Number(avgEff.toFixed(1)),
    };
  }, [chartData]);

  // Unique list of SKUs and Lines from records for filters
  const uniqueSkus = useMemo(() => {
    const set = new Set(actualRecords.map((r) => r.skuCode));
    return Array.from(set);
  }, [actualRecords]);

  const uniqueLines = useMemo(() => {
    const set = new Set(actualRecords.map((r) => r.lineId));
    return Array.from(set);
  }, [actualRecords]);

  // Custom Dark Industrial Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;

      const isPositive = data.deltaMio >= 0;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs z-50 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
            <span className="font-bold text-white font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              {data.fullDate}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {data.lineId.replace('LINE-', 'LU#')} • {data.skuCode}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {isAr ? 'الهدف المخطط:' : 'Planned Target:'}
              </span>
              <span className="font-bold text-slate-200">{data.plannedMio} Mio</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {isAr ? 'الإنتاج الفعلي:' : 'Actual Output:'}
              </span>
              <span className="font-bold text-emerald-400">{data.actualMio} Mio</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">{isAr ? 'فارق الإنتاج (Delta):' : 'Output Delta:'}</span>
              <span
                className={`font-extrabold flex items-center gap-0.5 ${
                  isPositive ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {data.deltaMio} Mio ({isPositive ? '+' : ''}
                {data.variancePercent}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isAr ? 'نسبة الالتزام:' : 'Adherence Rate:'}</span>
              <span className="font-bold text-cyan-300">{data.adherencePercent}%</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isAr ? 'الكفاءة (مخططة / فعلية):' : 'Efficiency (Plan / Act):'}</span>
              <span>
                {data.plannedEfficiency}% / {data.actualEfficiency}%
              </span>
            </div>

            {data.notes && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 italic">
                "{data.notes}"
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="actual-vs-planned-trends-section"
      className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl p-5 sm:p-6 space-y-5 relative overflow-hidden"
    >
      {/* Decorative ambient background blur */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar: Title, view mode tabs & interactive filters */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>
                  {isAr
                    ? 'تحليل اتجاهات الإنتاج الفعلي مقابل المخطط (30 يوماً)'
                    : 'Actual vs. Planned Production Output Trends (Last 30 Days)'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {chartData.length} {isAr ? 'تسجيلاً' : 'Records'} • Task 7
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'رسم بياني تفاعلي باستخدام Recharts يوضح مقارنة حجم الإنتاج الفعلي مقابل الحصة المخططة، معدلات الالتزام، وفوارق الورديات.'
                  : 'Interactive Recharts visualization comparing actual production volumes against planned targets, adherence ratios, and shift variances.'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              id="view-mode-daily"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'daily'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isAr ? 'الإنتاج اليومي' : 'Daily Output'}</span>
            </button>
            <button
              id="view-mode-cumulative"
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'cumulative'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isAr ? 'التراكمي (30 يوم)' : 'Cumulative'}</span>
            </button>
            <button
              id="view-mode-efficiency"
              onClick={() => setViewMode('efficiency')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'efficiency'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isAr ? 'الكفاءة (%)' : 'Efficiency'}</span>
            </button>
          </div>

          {/* SKU Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">{isAr ? 'الصنف:' : 'SKU:'}</span>
            <select
              id="trend-filter-sku"
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                {isAr ? 'كافة الأصناف (All SKUs)' : 'All SKUs'}
              </option>
              {uniqueSkus.map((sku) => (
                <option key={sku} value={sku} className="bg-slate-900 text-white">
                  {sku}
                </option>
              ))}
            </select>
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">{isAr ? 'الخط:' : 'Line:'}</span>
            <select
              id="trend-filter-line"
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="bg-transparent text-purple-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                {isAr ? 'كافة الخطوط (All LU#)' : 'All LU#'}
              </option>
              {uniqueLines.map((lineId) => (
                <option key={lineId} value={lineId} className="bg-slate-900 text-white">
                  {lineId.replace('LINE-', 'LU#')}
                </option>
              ))}
            </select>
          </div>

          {/* Link to Task 7 */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('task7')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title={isAr ? 'الانتقال إلى سجلات الإنتاج وإغلاق الورديات' : 'Go to Production History & Shift Records'}
            >
              <span>{isAr ? 'سجلات المهمة 7' : 'Task 7 Records'}</span>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* 30-Day Aggregated Performance KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: 30-Day Planned Target */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'إجمالي المخطط (30 يوماً)' : '30-Day Planned Target'}</span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {stats.totalPlannedMio}{' '}
            <span className="text-xs font-normal text-slate-400">
              {isAr ? 'مليون سيجارة' : 'Mio Sticks'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{isAr ? 'متوسط يومي:' : 'Daily Avg:'}</span>
            <span className="font-mono text-slate-300">
              {(stats.totalPlannedMio / Math.max(1, chartData.length)).toFixed(2)} Mio/day
            </span>
          </div>
        </div>

        {/* Card 2: 30-Day Actual Produced */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'إجمالي الفعلي (30 يوماً)' : '30-Day Actual Output'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">
            {stats.totalActualMio}{' '}
            <span className="text-xs font-normal text-slate-400">
              {isAr ? 'مليون سيجارة' : 'Mio Sticks'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{isAr ? 'متوسط يومي:' : 'Daily Avg:'}</span>
            <span className="font-mono text-emerald-300">
              {(stats.totalActualMio / Math.max(1, chartData.length)).toFixed(2)} Mio/day
            </span>
          </div>
        </div>

        {/* Card 3: Adherence Rate */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'معدل الالتزام الكلي' : 'Plan Adherence Ratio'}</span>
            {stats.overallAdherence >= 97 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="text-xl font-extrabold font-mono flex items-center gap-1.5">
            <span
              className={
                stats.overallAdherence >= 97
                  ? 'text-emerald-400'
                  : stats.overallAdherence >= 95
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {stats.overallAdherence}%
            </span>
            <span className="text-xs font-normal text-slate-400">
              ({stats.netDeltaMio >= 0 ? '+' : ''}
              {stats.netDeltaMio} Mio)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                stats.overallAdherence >= 97 ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, stats.overallAdherence)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Variance & Performance Distribution */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'متوسط الفارق & الكفاءة' : 'Mean Variance & Eff.'}</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 font-mono">
            {stats.avgDailyVariance >= 0 ? '+' : ''}
            {stats.avgDailyVariance}%{' '}
            <span className="text-xs font-normal text-slate-400">
              (Eff: {stats.avgEfficiency}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-emerald-400 font-mono">
              {stats.positiveDays} {isAr ? 'أيام متفوقة' : 'days ahead'}
            </span>
            <span>•</span>
            <span className="text-amber-400 font-mono">
              {stats.negativeDays} {isAr ? 'أيام عجز طفيف' : 'days behind'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="bg-slate-950/80 rounded-xl p-4 sm:p-5 border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" />
            <span className="text-slate-300">{isAr ? 'الهدف المخطط (Mio)' : 'Planned Target (Mio)'}</span>
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 ms-3" />
            <span className="text-emerald-400 font-semibold">
              {isAr ? 'الإنتاج الفعلي (Mio)' : 'Actual Produced (Mio)'}
            </span>
            {viewMode === 'daily' && (
              <>
                <span className="inline-block w-3 h-1 bg-cyan-400 ms-3" />
                <span className="text-cyan-300">{isAr ? 'خط الاتجاه الفعلي' : 'Actual Trend'}</span>
              </>
            )}
          </div>
          <div className="hidden sm:block text-[11px] text-slate-500">
            {isAr ? 'بيانات آخر 30 يوماً من سجلات الوردية (Task 7)' : '30-Day Historical Production Records (Task 7)'}
          </div>
        </div>

        <div className="h-72 sm:h-80 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'daily' ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="actualBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="plannedBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#475569" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={Math.ceil(chartData.length / 15)}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="plannedMio"
                  name={isAr ? 'المخطط' : 'Planned'}
                  fill="url(#plannedBarGrad)"
                  stroke="#64748b"
                  strokeWidth={1}
                  radius={[3, 3, 0, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="actualMio"
                  name={isAr ? 'الفعلي' : 'Actual'}
                  fill="url(#actualBarGrad)"
                  stroke="#34d399"
                  strokeWidth={1}
                  radius={[3, 3, 0, 0]}
                  barSize={12}
                />
                <Line
                  type="monotone"
                  dataKey="actualMio"
                  name={isAr ? 'اتجاه الفعلي' : 'Actual Trend'}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            ) : viewMode === 'cumulative' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="cumPlannedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cumActualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={Math.ceil(chartData.length / 15)}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulativePlannedMio"
                  name={isAr ? 'التراكمي المخطط' : 'Cumulative Planned'}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  fill="url(#cumPlannedGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeActualMio"
                  name={isAr ? 'التراكمي الفعلي' : 'Cumulative Actual'}
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#cumActualGrad)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={Math.ceil(chartData.length / 15)}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  domain={[75, 95]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target 85%', fill: '#f59e0b', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="plannedEfficiency"
                  name={isAr ? 'الكفاءة المخططة' : 'Planned Efficiency'}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actualEfficiency"
                  name={isAr ? 'الكفاءة الفعلية' : 'Actual Efficiency'}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Insight Banner: Closed Loop Feedback with Task 7 & Task 8 */}
      <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-slate-300">
            {isAr
              ? 'حلقة التغذية الراجعة المغلقة: يتم تغذية هذه الاتجاهات تلقائياً إلى خوارزمية التعلم التكيفي (Task 8) لإعادة معايرة سرعات الخطوط ومعاملات الهدر.'
              : 'Closed-Loop Orchestration: These variance trends automatically feed the Task 8 Adaptive Learning Engine to recalibrate line speeds and scrap baselines.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('task8')}
                className="text-[11px] px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 font-semibold"
              >
                <span>{isAr ? 'معايرة Task 8' : 'Task 8 Calibration'}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              </button>
              <button
                onClick={() => onNavigateTab('task7')}
                className="text-[11px] px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1 font-semibold"
              >
                <span>{isAr ? 'إضافة تسجيل جديد' : 'Log New Shift'}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
