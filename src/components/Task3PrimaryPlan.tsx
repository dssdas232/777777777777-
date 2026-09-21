import React, { useState } from 'react';
import {
  Factory,
  Layers,
  Database,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  Language,
  FactoryConstants,
  BatchScheduleItem,
} from '../types';
import { calculatePrimaryPlan } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task3PrimaryPlanProps {
  language: Language;
  constants: FactoryConstants;
  totalDemandFromTask1: number;
  batchSchedules: BatchScheduleItem[];
  onUpdateConstants: (constants: FactoryConstants) => void;
  onUpdateBatchSchedules: (schedules: BatchScheduleItem[]) => void;
}

export const Task3PrimaryPlan: React.FC<Task3PrimaryPlanProps> = ({
  language,
  constants,
  totalDemandFromTask1,
  batchSchedules,
  onUpdateConstants,
  onUpdateBatchSchedules,
}) => {
  const isAr = language === 'ar';

  const [batchSize, setBatchSize] = useState<number>(constants.blendBatchSizeKg || 10000);
  const [useCustomDemand, setUseCustomDemand] = useState(false);
  const [customDemand, setCustomDemand] = useState<number>(totalDemandFromTask1 || 33750);

  const effectiveDemand = useCustomDemand ? customDemand : totalDemandFromTask1;
  const primarySummary = calculatePrimaryPlan(effectiveDemand, batchSize);

  const handleBatchSizeChange = (val: number) => {
    setBatchSize(val);
    onUpdateConstants({ ...constants, blendBatchSizeKg: val });
    eventBus.setNodeStatus('task-3', 'Running', 1200);
    eventBus.addEventLog({
      source: 'Task 3: Primary Plan',
      eventType: 'TOOL_EXECUTION',
      message: `Primary batch size updated to ${val.toLocaleString()} kg. Recalculated ${Math.ceil(effectiveDemand / val)} batches.`,
      status: 'success',
    });
  };

  const handleStatusChange = (batchNumber: number, newStatus: BatchScheduleItem['status']) => {
    const updated = batchSchedules.map((b) => {
      if (b.batchNumber === batchNumber) {
        return { ...b, status: newStatus };
      }
      return b;
    });
    onUpdateBatchSchedules(updated);
    eventBus.setNodeStatus('task-3', 'Running', 800);
  };

  const handleAddScheduleRow = () => {
    const nextNum = batchSchedules.length + 1;
    const newBatch: BatchScheduleItem = {
      batchNumber: nextNum,
      batchCode: `BATCH-2026-0923-${String.fromCharCode(64 + nextNum)}`,
      scheduledDate: new Date().toISOString().slice(0, 10),
      shift: 'Morning (06:00 - 14:00)',
      targetKg: batchSize,
      siloId: `SILO-0${((nextNum - 1) % 4) + 1}`,
      status: 'Scheduled',
    };
    onUpdateBatchSchedules([...batchSchedules, newBatch]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المهمة 3: خطة الإنتاج الأولي (Primary Tobacco Processing Plan)' : 'Task 3: Primary Tobacco Processing Plan'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {isAr ? 'حساب الدفعات والفائض' : 'Batch Allocation & Surplus'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تجميع احتياج التبغ المفروم من خطة الإنتاج الثانوي وحساب عدد الدفعات التقريبي بالتقريب للأعلى ROUNDUP'
              : 'Aggregating cut filler demand from Task 1 and computing batch cycles via mathematical ROUNDUP'}
          </p>
        </div>

        {/* Batch Size Quick Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400">{isAr ? 'حجم الدفعة (كغم):' : 'Batch Size (kg):'}</span>
          <input
            type="number"
            step="500"
            min="1000"
            value={batchSize}
            onChange={(e) => handleBatchSizeChange(parseFloat(e.target.value) || 10000)}
            className="bg-slate-800 border border-amber-500/50 rounded px-2.5 py-1 text-xs font-bold text-amber-300 w-24 focus:outline-none"
          />
          <span className="text-xs text-slate-400">kg</span>
        </div>
      </div>

      {/* Demand Source Control */}
      <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-medium">
            {isAr ? 'مصدر إجمالي الطلب:' : 'Tobacco Demand Source:'}
          </span>
          <button
            onClick={() => setUseCustomDemand(false)}
            className={`px-3 py-1 rounded-md transition-colors ${
              !useCustomDemand
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isAr ? `تلقائي من المهمة 1 (${totalDemandFromTask1.toLocaleString()} كغم)` : `Auto from Task 1 (${totalDemandFromTask1.toLocaleString()} kg)`}
          </button>
          <button
            onClick={() => setUseCustomDemand(true)}
            className={`px-3 py-1 rounded-md transition-colors ${
              useCustomDemand
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isAr ? 'تحديد يدوي / محاكاة' : 'Custom / Simulation'}
          </button>
        </div>

        {useCustomDemand && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isAr ? 'الطلب المخصص (كغم):' : 'Custom Demand (kg):'}</span>
            <input
              type="number"
              step="500"
              value={customDemand}
              onChange={(e) => setCustomDemand(parseFloat(e.target.value) || 0)}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white w-28"
            />
          </div>
        )}
      </div>

      {/* 4 Main Calculation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'إجمالي الطلب من الثانوي' : 'Total Demand (Task 1)'}</span>
            <Factory className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {primarySummary.totalTobaccoDemandKg.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'مجموع التبغ المطلوب لكل المنتجات' : 'Sum of cut filler for all active SKUs'}
          </p>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'عدد الدفعات (ROUNDUP)' : 'Batches (ROUNDUP)'}</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">
            {primarySummary.batchesCount}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'دفعات' : 'Batches'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            = ROUNDUP({primarySummary.totalTobaccoDemandKg.toLocaleString()} / {primarySummary.batchSizeKg.toLocaleString()})
          </p>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'إجمالي إنتاج الخلطات' : 'Total Primary Output'}</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {primarySummary.totalProducedKg.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {primarySummary.batchesCount} × {primarySummary.batchSizeKg.toLocaleString()} kg
          </p>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'الفائض للصوامع (Surplus)' : 'Surplus Buffer'}</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            +{primarySummary.surplusKg.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'مخزون أمان في صوامع التعتيق' : 'Safety buffer staged into aging silos'}
          </p>
        </div>
      </div>

      {/* Silo Visual Level Indicators */}
      <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          {isAr ? 'حالة صوامع التخزين الوسيطة للخلطة (Cut Filler Silos)' : 'Cut Filler Aging Silos Status'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['SILO-01', 'SILO-02', 'SILO-03', 'SILO-04'].map((silo, idx) => {
            const fillPcts = [85, 92, 40, 0];
            const pct = fillPcts[idx];
            return (
              <div key={silo} className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-amber-400">{silo}</span>
                  <span className="text-slate-400">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 80 ? 'bg-amber-400' : pct > 0 ? 'bg-cyan-400' : 'bg-slate-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                  <span>{isAr ? 'السعة: 15,000 كغم' : 'Cap: 15,000 kg'}</span>
                  <span className={pct > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                    {pct > 0 ? (isAr ? 'تعتيق نشط' : 'Resting') : (isAr ? 'فارغ' : 'Empty')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Scheduling Table */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {isAr ? 'جدول جدولة تشغيل الدفعات (Primary Batch Execution Schedule)' : 'Primary Batch Execution Schedule'}
            </span>
          </div>
          <button
            onClick={handleAddScheduleRow}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة دفعة' : 'Add Batch'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-300 border-b border-slate-700 text-xs uppercase font-semibold">
                <th className="p-3">#</th>
                <th className="p-3">{isAr ? 'كود الدفعة' : 'Batch Code'}</th>
                <th className="p-3">{isAr ? 'تاريخ الجدولة' : 'Date'}</th>
                <th className="p-3">{isAr ? 'الوردية' : 'Shift'}</th>
                <th className="p-3 text-amber-300">{isAr ? 'الوزن المخطط (كغم)' : 'Target Weight (kg)'}</th>
                <th className="p-3">{isAr ? 'الصومعة المعينة' : 'Silo'}</th>
                <th className="p-3">{isAr ? 'حالة التشغيل' : 'Status'}</th>
                <th className="p-3 text-emerald-300">{isAr ? 'الفعلي (كغم)' : 'Actual (kg)'}</th>
                <th className="p-3">{isAr ? 'الانحراف' : 'Variance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {batchSchedules.map((batch) => (
                <tr key={batch.batchNumber} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono text-slate-400">{batch.batchNumber}</td>
                  <td className="p-3 font-mono font-bold text-slate-200">{batch.batchCode}</td>
                  <td className="p-3 text-slate-300">{batch.scheduledDate}</td>
                  <td className="p-3 text-slate-300">{batch.shift}</td>
                  <td className="p-3 font-bold text-amber-400">{batch.targetKg.toLocaleString()} kg</td>
                  <td className="p-3 font-mono text-cyan-300">{batch.siloId}</td>
                  <td className="p-3">
                    <select
                      value={batch.status}
                      onChange={(e) =>
                        handleStatusChange(batch.batchNumber, e.target.value as BatchScheduleItem['status'])
                      }
                      className={`text-xs px-2 py-1 rounded font-semibold border ${
                        batch.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : batch.status === 'In Progress'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </td>
                  <td className="p-3 font-bold text-emerald-400">
                    {batch.actualKg ? `${batch.actualKg.toLocaleString()} kg` : '-'}
                  </td>
                  <td className="p-3">
                    {batch.variancePercent !== undefined ? (
                      <span
                        className={`text-xs font-mono font-semibold ${
                          Math.abs(batch.variancePercent) > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {batch.variancePercent > 0 ? `+${batch.variancePercent}%` : `${batch.variancePercent}%`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
