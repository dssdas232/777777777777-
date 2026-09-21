import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Filter,
  Plus,
  Download,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react';
import {
  Language,
  ActualProductionRecord,
  AuditLogEntry,
  SecondaryPlanItem,
  ProductionLine,
} from '../types';
import { eventBus } from '../services/eventBus';

interface Task7ProductionHistoryProps {
  language: Language;
  actualRecords: ActualProductionRecord[];
  auditLogs: AuditLogEntry[];
  planItems: SecondaryPlanItem[];
  lines: ProductionLine[];
  onAddActualRecord: (record: Omit<ActualProductionRecord, 'id'>) => void;
}

export const Task7ProductionHistory: React.FC<Task7ProductionHistoryProps> = ({
  language,
  actualRecords,
  auditLogs,
  planItems,
  lines,
  onAddActualRecord,
}) => {
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'runs' | 'audit'>('runs');
  const [selectedSkuFilter, setSelectedSkuFilter] = useState<string>('ALL');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Form for logging actual production run
  const [newRun, setNewRun] = useState({
    skuCode: planItems[0]?.skuCode || 'SKU-001',
    lineId: lines[0]?.id || 'LINE-01',
    plannedTargetMio: 15.0,
    actualProducedMio: 14.8,
    plannedTobaccoKg: 11250,
    actualTobaccoKg: 11450,
    plannedEfficiency: 85,
    actualEfficiency: 81.5,
    plannedStickWeightG: 0.75,
    actualStickWeightG: 0.763,
    notes: '',
  });

  // Filter actual records
  const filteredRecords = actualRecords.filter((r) => {
    if (selectedSkuFilter !== 'ALL' && r.skuCode !== selectedSkuFilter) return false;
    if (selectedLineFilter !== 'ALL' && r.lineId !== selectedLineFilter) return false;
    return true;
  });

  const handleAddRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const varianceTobacco =
      ((newRun.actualTobaccoKg - newRun.plannedTobaccoKg) / newRun.plannedTobaccoKg) * 100;
    const varianceOutput =
      ((newRun.actualProducedMio - newRun.plannedTargetMio) / newRun.plannedTargetMio) * 100;
    const varianceEff =
      ((newRun.actualEfficiency - newRun.plannedEfficiency) / newRun.plannedEfficiency) * 100;

    onAddActualRecord({
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      skuCode: newRun.skuCode,
      lineId: newRun.lineId,
      plannedTargetMio: Number(newRun.plannedTargetMio),
      actualProducedMio: Number(newRun.actualProducedMio),
      plannedTobaccoKg: Number(newRun.plannedTobaccoKg),
      actualTobaccoKg: Number(newRun.actualTobaccoKg),
      plannedEfficiency: Number(newRun.plannedEfficiency),
      actualEfficiency: Number(newRun.actualEfficiency),
      plannedStickWeightG: Number(newRun.plannedStickWeightG),
      actualStickWeightG: Number(newRun.actualStickWeightG),
      varianceTobaccoPercent: Number(varianceTobacco.toFixed(2)),
      varianceOutputPercent: Number(varianceOutput.toFixed(2)),
      varianceEfficiencyPercent: Number(varianceEff.toFixed(2)),
      notes: newRun.notes || (isAr ? 'تسجيل إغلاق وردية' : 'Shift end production report'),
    });

    setIsLogModalOpen(false);
    eventBus.setNodeStatus('database', 'Running', 1200);
    eventBus.addEventLog({
      source: 'Task 7: Database History',
      eventType: 'DB_SYNC',
      message: `New actual production run recorded for ${newRun.skuCode} on ${newRun.lineId}. Variance: ${varianceTobacco.toFixed(2)}%.`,
      status: 'success',
    });
  };

  const exportHistoryCSV = () => {
    const headers = [
      'Timestamp',
      'SKU Code',
      'Line ID',
      'Planned Mio',
      'Actual Mio',
      'Planned Tobacco (kg)',
      'Actual Tobacco (kg)',
      'Tobacco Var %',
      'Planned Eff %',
      'Actual Eff %',
      'Stick Weight (g)',
      'Notes',
    ];

    const rows = filteredRecords.map((r) => [
      r.timestamp,
      r.skuCode,
      r.lineId,
      r.plannedTargetMio,
      r.actualProducedMio,
      r.plannedTobaccoKg,
      r.actualTobaccoKg,
      `${r.varianceTobaccoPercent}%`,
      r.plannedEfficiency,
      r.actualEfficiency,
      r.actualStickWeightG,
      `"${r.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_History_${new Date().toISOString().slice(0, 10)}.csv`);
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
              {isAr ? 'المهمة 7: سجل الإنتاج والتدقيق (Production History & Audit Log)' : 'Task 7: Production History & Audit Trail'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Database className="w-3 h-3" />
              {isAr ? 'Firestore Persistent' : 'Firestore Persistent'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'مقارنة الفعلي مقابل المخطط (Actual vs Planned) وحفظ سجل تدقيق كامل لكل تعديلات BOM'
              : 'Complete historical runs registry with Variance tracking & immutable BOM revision audit trail'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'تسجيل إنتاج فعلي' : 'Log Actual Run'}</span>
          </button>

          <button
            onClick={exportHistoryCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Actual vs Planned vs Audit Log */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('runs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeSubTab === 'runs'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isAr ? 'سجل التشغيل الفعلي (Actual vs Planned)' : 'Actual Production Runs'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-900/60 text-slate-200">
              {filteredRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? 'سجل تدقيق التعديلات (BOM Audit Log)' : 'Audit Trail Logs'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-900/60 text-slate-200">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Filters */}
        {activeSubTab === 'runs' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              {isAr ? 'فلترة:' : 'Filter:'}
            </span>
            <select
              value={selectedSkuFilter}
              onChange={(e) => setSelectedSkuFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="ALL">{isAr ? 'جميع المنتجات (All SKUs)' : 'All SKUs'}</option>
              {planItems.map((i) => (
                <option key={i.skuCode} value={i.skuCode}>
                  {i.skuCode}
                </option>
              ))}
            </select>

            <select
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="ALL">{isAr ? 'جميع الخطوط (All Lines)' : 'All Lines'}</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content: Actual Runs Table */}
      {activeSubTab === 'runs' && (
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700 text-xs uppercase font-semibold">
                  <th className="p-3">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                  <th className="p-3">{isAr ? 'المنتج' : 'SKU'}</th>
                  <th className="p-3">{isAr ? 'الخط' : 'Line'}</th>
                  <th className="p-3">{isAr ? 'المخطط (Mio)' : 'Plan (Mio)'}</th>
                  <th className="p-3 text-cyan-300">{isAr ? 'الفعلي (Mio)' : 'Actual (Mio)'}</th>
                  <th className="p-3">{isAr ? 'التبغ المخطط (kg)' : 'Plan Tobacco'}</th>
                  <th className="p-3 text-amber-300">{isAr ? 'التبغ الفعلي (kg)' : 'Actual Tobacco'}</th>
                  <th className="p-3 text-emerald-300">{isAr ? 'انحراف التبغ' : 'Tobacco Var%'}</th>
                  <th className="p-3">{isAr ? 'الكفاءة الفعلية' : 'Actual Eff%'}</th>
                  <th className="p-3">{isAr ? 'وزن السيجارة' : 'Stick Weight'}</th>
                  <th className="p-3">{isAr ? 'الملاحظات' : 'Shift Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-xs">{rec.timestamp}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">{rec.skuCode}</td>
                    <td className="p-3 text-slate-300">{rec.lineId}</td>
                    <td className="p-3 text-slate-300">{rec.plannedTargetMio}</td>
                    <td className="p-3 font-bold text-cyan-300">{rec.actualProducedMio}</td>
                    <td className="p-3 text-slate-300">{rec.plannedTobaccoKg.toLocaleString()}</td>
                    <td className="p-3 font-bold text-amber-400">{rec.actualTobaccoKg.toLocaleString()}</td>
                    <td className="p-3">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          Math.abs(rec.varianceTobaccoPercent) > 2.0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {rec.varianceTobaccoPercent > 0
                          ? `+${rec.varianceTobaccoPercent}%`
                          : `${rec.varianceTobaccoPercent}%`}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200">
                      {rec.actualEfficiency}%{' '}
                      <span className="text-[10px] text-slate-400">({rec.plannedEfficiency}%)</span>
                    </td>
                    <td className="p-3 font-mono text-amber-300">{rec.actualStickWeightG} g</td>
                    <td className="p-3 text-xs text-slate-400 max-w-xs truncate">{rec.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Audit Log Table */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700 text-xs uppercase font-semibold">
                  <th className="p-3">{isAr ? 'الطابع الزمني' : 'Timestamp'}</th>
                  <th className="p-3">{isAr ? 'الفاعل (Actor)' : 'Actor'}</th>
                  <th className="p-3">{isAr ? 'القسم / الشاشة' : 'Section'}</th>
                  <th className="p-3">{isAr ? 'الحقل المعدل' : 'Field Modified'}</th>
                  <th className="p-3 text-rose-300">{isAr ? 'القيمة السابقة' : 'Old Value'}</th>
                  <th className="p-3 text-emerald-300">{isAr ? 'القيمة الجديدة' : 'New Value'}</th>
                  <th className="p-3">{isAr ? 'السبب / السياق' : 'Reason / Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-xs">{log.timestamp}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-900 text-amber-400 border border-slate-700">
                        {log.actor}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-200">{log.section}</td>
                    <td className="p-3 font-mono text-cyan-300">{log.fieldChanged}</td>
                    <td className="p-3 font-mono text-rose-300 text-xs max-w-xs truncate">{log.oldValue}</td>
                    <td className="p-3 font-mono text-emerald-300 text-xs font-bold max-w-xs truncate">
                      {log.newValue}
                    </td>
                    <td className="p-3 text-xs text-slate-400">{log.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Log New Actual Production Run */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {isAr ? 'تسجيل بيانات الإنتاج الفعلي للوردية' : 'Log Shift Actual Production Run'}
            </h3>

            <form onSubmit={handleAddRunSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'المنتج' : 'SKU'}</label>
                  <select
                    value={newRun.skuCode}
                    onChange={(e) => setNewRun({ ...newRun, skuCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {planItems.map((i) => (
                      <option key={i.skuCode} value={i.skuCode}>
                        {i.skuCode} - {i.skuName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الخط' : 'Line'}</label>
                  <select
                    value={newRun.lineId}
                    onChange={(e) => setNewRun({ ...newRun, lineId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'المخطط (مليون سيجارة)' : 'Planned Target (Mio)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRun.plannedTargetMio}
                    onChange={(e) => setNewRun({ ...newRun, plannedTargetMio: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الإنتاج الفعلي (مليون)' : 'Actual Produced (Mio)'}</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newRun.actualProducedMio}
                    onChange={(e) => setNewRun({ ...newRun, actualProducedMio: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-amber-500/60 rounded px-2 py-1 text-xs text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'التبغ المخطط (كغم)' : 'Planned Tobacco (kg)'}</label>
                  <input
                    type="number"
                    step="10"
                    value={newRun.plannedTobaccoKg}
                    onChange={(e) => setNewRun({ ...newRun, plannedTobaccoKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'التبغ المستهلك الفعلي (كغم)' : 'Actual Tobacco Consumed (kg)'}</label>
                  <input
                    type="number"
                    step="10"
                    value={newRun.actualTobaccoKg}
                    onChange={(e) => setNewRun({ ...newRun, actualTobaccoKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-amber-500/60 rounded px-2 py-1 text-xs text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الكفاءة الفعلية (%)' : 'Actual Efficiency (%)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRun.actualEfficiency}
                    onChange={(e) => setNewRun({ ...newRun, actualEfficiency: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'متوسط وزن السيجارة الفعلي (غم)' : 'Actual Stick Weight (g)'}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRun.actualStickWeightG}
                    onChange={(e) => setNewRun({ ...newRun, actualStickWeightG: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{isAr ? 'ملاحظات الوردية' : 'Shift Notes'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: توقف مؤقت لتبديل بكرة الورق' : 'e.g. Micro-stop on tipping knife'}
                  value={newRun.notes}
                  onChange={(e) => setNewRun({ ...newRun, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
                >
                  {isAr ? 'تسجيل وحفظ' : 'Log & Calculate Variance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
