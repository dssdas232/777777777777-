import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Clock,
  Scale,
  Package,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import {
  Language,
  FactoryConstants,
  SecondaryPlanItem,
  PackType,
  ProductionLine,
} from '../types';
import {
  calculateSecondaryPlanItem,
  calculateSecondaryTotals,
} from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';
import { excelService } from '../services/excelService';

interface Task1SecondaryPlanProps {
  language: Language;
  constants: FactoryConstants;
  planItems: SecondaryPlanItem[];
  lines: ProductionLine[];
  onUpdatePlan: (items: SecondaryPlanItem[]) => void;
}

export const Task1SecondaryPlan: React.FC<Task1SecondaryPlanProps> = ({
  language,
  constants,
  planItems,
  lines,
  onUpdatePlan,
}) => {
  const isAr = language === 'ar';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await excelService.parseExcelFile(file, constants);
    if (res.success && res.items.length > 0) {
      onUpdatePlan(res.items);
      setImportStatus(
        isAr
          ? `✅ تم بنجاح استيراد ${res.items.length} صنفاً (${res.summary.totalMio.toLocaleString()} مليون سيجارة) وعكس الخطة على المصنع!`
          : `✅ Successfully imported ${res.items.length} SKUs (${res.summary.totalMio.toLocaleString()} Mio sticks) and reflected to factory!`
      );
      setTimeout(() => setImportStatus(null), 6000);
      eventBus.addEventLog({
        source: 'Task 1: Secondary Plan',
        eventType: 'USER_ACTION',
        message: `Imported ${res.items.length} SKUs from ${file.name}.`,
        status: 'success',
      });
    } else {
      alert(res.error || 'تعذر استيراد ملف الإكسل');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [newSku, setNewSku] = useState<Partial<SecondaryPlanItem>>({
    skuCode: `SKU-00${planItems.length + 1}`,
    skuName: '',
    packType: 'Hard',
    lineId: lines[0]?.id || 'LINE-01',
    targetMio: 10.0,
    lineRateMioPerHour: 0.45,
    efficiencyPercent: 85,
  });

  // Calculate each row and total row
  const calculatedItems = planItems.map((item) =>
    calculateSecondaryPlanItem(item, constants)
  );
  const totals = calculateSecondaryTotals(calculatedItems);

  // Trigger Architecture Dashboard visual state
  const triggerEnginePulse = () => {
    eventBus.setNodeStatus('task-1', 'Running', 1200);
    eventBus.addEventLog({
      source: 'Task 1: Secondary Plan',
      eventType: 'TOOL_EXECUTION',
      message: `Secondary plan calculated: ${totals.targetMio} Mio Cigarettes, ${totals.cartons.toLocaleString()} Cartons, ${totals.tobaccoRequiredKg.toLocaleString()} kg Cut Filler.`,
      status: 'success',
    });
  };

  const handleUpdateItem = (id: string, field: keyof SecondaryPlanItem, value: any) => {
    const updated = planItems.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onUpdatePlan(updated);
    triggerEnginePulse();
  };

  const handleDeleteItem = (id: string) => {
    if (planItems.length <= 1) {
      alert(isAr ? 'يجب الإبقاء على منتج واحد على الأقل في الخطة' : 'Must keep at least one SKU in plan');
      return;
    }
    const updated = planItems.filter((i) => i.id !== id);
    onUpdatePlan(updated);
    triggerEnginePulse();
  };

  const handleAddSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.skuName || !newSku.skuCode) return;

    const newItem: SecondaryPlanItem = {
      id: 'plan-' + Date.now(),
      skuCode: newSku.skuCode,
      skuName: newSku.skuName,
      packType: newSku.packType as PackType,
      lineId: newSku.lineId || lines[0]?.id || 'LINE-01',
      targetMio: Number(newSku.targetMio) || 5,
      lineRateMioPerHour: Number(newSku.lineRateMioPerHour) || 0.45,
      efficiencyPercent: Number(newSku.efficiencyPercent) || 85,
    };

    onUpdatePlan([...planItems, newItem]);
    setIsAddModalOpen(false);
    triggerEnginePulse();
    setNewSku({
      skuCode: `SKU-00${planItems.length + 2}`,
      skuName: '',
      packType: 'Hard',
      lineId: lines[0]?.id || 'LINE-01',
      targetMio: 10.0,
      lineRateMioPerHour: 0.45,
      efficiencyPercent: 85,
    });
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      'SKU Code',
      'SKU Name',
      'Pack Type',
      'Line',
      'Target (Mio.Cig)',
      'Cartons (100/Mio)',
      'Packs (500/Carton)',
      'Sticks (10k/Carton)',
      `Tobacco Required (kg @ ${constants.tobaccoWeightPerStickG}g)`,
      'Line Rate (Mio/hr)',
      'Efficiency %',
      'Required Hours',
      'Required Days',
    ];

    const rows = calculatedItems.map((item) => {
      const lineName = lines.find((l) => l.id === item.lineId)?.name || item.lineId;
      return [
        item.skuCode,
        `"${item.skuName}"`,
        item.packType,
        `"${lineName}"`,
        item.targetMio,
        item.cartons,
        item.packs,
        item.sticks,
        item.tobaccoRequiredKg,
        item.lineRateMioPerHour,
        item.efficiencyPercent,
        item.requiredHours,
        item.requiredDays,
      ];
    });

    const totalRow = [
      'TOTAL',
      'ALL SKUs',
      '-',
      '-',
      totals.targetMio,
      totals.cartons,
      totals.packs,
      totals.sticks,
      totals.tobaccoRequiredKg,
      '-',
      '-',
      totals.requiredHours,
      totals.requiredDays,
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(',')), totalRow.join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Secondary_Production_Plan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المهمة 1: خطة الإنتاج الثانوي (Secondary Production Plan)' : 'Task 1: Secondary Production Plan'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {isAr ? 'حسابات تفاعلية لحظية' : 'Real-time Calculations'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? `الثوابت المطبقة: 100 كرتونة/مليون | 500 علبة/كرتونة | 10,000 سيجارة/كرتونة | وزن التبغ = ${constants.tobaccoWeightPerStickG} غم/سيجارة`
              : `Applied Standards: 100 Cartons/Mio | 500 Packs/Carton | 10,000 Sticks/Carton | Stick Tobacco = ${constants.tobaccoWeightPerStickG}g`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden File Input for Excel Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={handleExcelImport}
          />

          <button
            id="import-secondary-excel-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            title={isAr ? 'استيراد وعكس خطة من ملف إكسل' : 'Import and reflect plan from Excel'}
          >
            <Upload className="w-4 h-4" />
            <span>{isAr ? 'استيراد إكسل 📊' : 'Import Excel 📊'}</span>
          </button>

          <button
            id="export-secondary-excel-btn"
            onClick={() => excelService.exportPlan(planItems, constants)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-600 text-white transition-colors border border-teal-600 shadow-sm"
            title={isAr ? 'تصدير الخطة الحالية إلى ملف إكسل (.xlsx)' : 'Export active plan to Excel (.xlsx)'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isAr ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>

          <button
            id="download-template-excel-btn"
            onClick={() => excelService.downloadTemplate()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
            title={isAr ? 'تحميل نموذج إكسل قياسي فارغ' : 'Download blank Excel template'}
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'نموذج إكسل' : 'Template'}</span>
          </button>

          <button
            id="add-sku-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة منتج (SKU)' : 'Add SKU'}</span>
          </button>
        </div>
      </div>

      {/* Excel Import Success Notice */}
      {importStatus && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{importStatus}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-1 rounded bg-emerald-900/60"
          >
            {isAr ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'إجمالي الهدف' : 'Total Target'}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {totals.targetMio.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'مليون' : 'Mio'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totals.sticks.toLocaleString()} {isAr ? 'سيجارة' : 'sticks'}
          </div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'الكراتين الخارجية' : 'Master Cartons'}</span>
            <Package className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-blue-300">
            {totals.cartons.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? '100 كرتونة / مليون' : '100 Cartons / Mio'}</div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'العلب (Packs)' : 'Total Packs'}</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-300">
            {totals.packs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? '500 علبة / كرتونة' : '500 Packs / Carton'}</div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'التبغ المطلوب' : 'Tobacco Required'}</span>
            <Scale className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            {totals.tobaccoRequiredKg.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'من الخلطة الأولية' : 'From Cut Filler'}</div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'ساعات التشغيل' : 'Required Hours'}</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-300">
            {totals.requiredHours.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'ساعة' : 'h'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totals.requiredDays.toFixed(1)} {isAr ? 'يوم عمل' : 'working days'}
          </div>
        </div>

        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAr ? 'المنتجات والخطوط' : 'SKUs & Lines'}</span>
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-300">
            {calculatedItems.length}{' '}
            <span className="text-xs font-normal text-slate-400">SKUs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{lines.length} {isAr ? 'خطوط تشغيل' : 'Lines Active'}</div>
        </div>
      </div>

      {/* Main Secondary Plan Table */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/80 text-slate-300 border-b border-slate-700 text-xs uppercase tracking-wider font-semibold">
                <th className="p-3 whitespace-nowrap">{isAr ? 'رمز المنتج' : 'SKU Code'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'اسم المنتج' : 'SKU Name'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'نوع العلبة' : 'Pack Type'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'خط الإنتاج' : 'Line'}</th>
                <th className="p-3 whitespace-nowrap text-amber-300">{isAr ? 'الهدف (مليون)' : 'Target (Mio)'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'الكراتين' : 'Cartons'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'العلب' : 'Packs'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'السجائر' : 'Sticks'}</th>
                <th className="p-3 whitespace-nowrap text-amber-300">{isAr ? 'التبغ (كغم)' : 'Tobacco (kg)'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'سرعة الخط (M/h)' : 'Rate (M/h)'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'الكفاءة %' : 'Eff %'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'الساعات المطلوبة' : 'Req. Hours'}</th>
                <th className="p-3 whitespace-nowrap">{isAr ? 'الأيام' : 'Days'}</th>
                <th className="p-3 whitespace-nowrap text-center">{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {calculatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-400">{item.skuCode}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={item.skuName}
                      onChange={(e) => handleUpdateItem(item.id, 'skuName', e.target.value)}
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs w-36 focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={item.packType}
                      onChange={(e) => handleUpdateItem(item.id, 'packType', e.target.value as PackType)}
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Hard">Hard (HLP)</option>
                      <option value="Soft">Soft (SP)</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={item.lineId}
                      onChange={(e) => handleUpdateItem(item.id, 'lineId', e.target.value)}
                      className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-32"
                    >
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={item.targetMio}
                      onChange={(e) => handleUpdateItem(item.id, 'targetMio', parseFloat(e.target.value) || 0)}
                      className="bg-slate-900/90 border border-amber-500/50 rounded px-2 py-1 text-amber-300 font-bold text-xs w-20 focus:outline-none focus:border-amber-400"
                    />
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{item.cartons.toLocaleString()}</td>
                  <td className="p-3 text-slate-300">{item.packs.toLocaleString()}</td>
                  <td className="p-3 text-slate-300">{item.sticks.toLocaleString()}</td>
                  <td className="p-3 font-bold text-amber-400">{item.tobaccoRequiredKg.toLocaleString()}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.lineRateMioPerHour}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'lineRateMioPerHour', parseFloat(e.target.value) || 0.45)
                      }
                      className="bg-slate-900/60 border border-slate-700 rounded px-1.5 py-1 text-xs w-16 text-slate-200"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="100"
                      value={item.efficiencyPercent}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'efficiencyPercent', parseFloat(e.target.value) || 85)
                      }
                      className="bg-slate-900/60 border border-slate-700 rounded px-1.5 py-1 text-xs w-16 text-slate-200"
                    />
                  </td>
                  <td className="p-3 text-slate-200 font-medium">{item.requiredHours} h</td>
                  <td className="p-3 text-slate-300">{item.requiredDays} d</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title={isAr ? 'حذف هذا المنتج' : 'Delete SKU'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Totals Row */}
              <tr className="bg-slate-950/80 font-bold border-t-2 border-amber-500/50 text-white text-xs sm:text-sm">
                <td className="p-3 text-amber-400 uppercase">{isAr ? 'الإجمالي العام' : 'TOTALS'}</td>
                <td className="p-3 text-slate-300">
                  {calculatedItems.length} {isAr ? 'منتجات' : 'SKUs'}
                </td>
                <td className="p-3">-</td>
                <td className="p-3">-</td>
                <td className="p-3 text-amber-300 font-extrabold text-sm">{totals.targetMio.toFixed(1)} M</td>
                <td className="p-3 text-blue-300">{totals.cartons.toLocaleString()}</td>
                <td className="p-3 text-cyan-300">{totals.packs.toLocaleString()}</td>
                <td className="p-3 text-slate-200">{totals.sticks.toLocaleString()}</td>
                <td className="p-3 text-amber-400 font-extrabold text-sm">
                  {totals.tobaccoRequiredKg.toLocaleString()} kg
                </td>
                <td className="p-3">-</td>
                <td className="p-3">-</td>
                <td className="p-3 text-emerald-300 font-bold">{totals.requiredHours.toFixed(1)} h</td>
                <td className="p-3 text-emerald-400 font-bold">{totals.requiredDays.toFixed(1)} d</td>
                <td className="p-3 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add SKU Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {isAr ? 'إضافة منتج جديد لخطة الإنتاج' : 'Add New SKU to Production Plan'}
            </h3>

            <form onSubmit={handleAddSku} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{isAr ? 'رمز المنتج (SKU Code)' : 'SKU Code'}</label>
                <input
                  type="text"
                  required
                  value={newSku.skuCode}
                  onChange={(e) => setNewSku({ ...newSku, skuCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{isAr ? 'اسم المنتج (SKU Name)' : 'SKU Name'}</label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: Red King Size Classic' : 'e.g. Red King Size Classic'}
                  value={newSku.skuName}
                  onChange={(e) => setNewSku({ ...newSku, skuName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'نوع العلبة' : 'Pack Type'}</label>
                  <select
                    value={newSku.packType}
                    onChange={(e) => setNewSku({ ...newSku, packType: e.target.value as PackType })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="Hard">Hard (HLP)</option>
                    <option value="Soft">Soft (SP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الخط المخصص' : 'Assigned Line'}</label>
                  <select
                    value={newSku.lineId}
                    onChange={(e) => setNewSku({ ...newSku, lineId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  >
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الهدف (مليون)' : 'Target (Mio)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    value={newSku.targetMio}
                    onChange={(e) => setNewSku({ ...newSku, targetMio: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'السرعة (M/h)' : 'Rate (M/h)'}</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={newSku.lineRateMioPerHour}
                    onChange={(e) =>
                      setNewSku({ ...newSku, lineRateMioPerHour: parseFloat(e.target.value) || 0.45 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isAr ? 'الكفاءة %' : 'Efficiency %'}</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="100"
                    required
                    value={newSku.efficiencyPercent}
                    onChange={(e) =>
                      setNewSku({ ...newSku, efficiencyPercent: parseFloat(e.target.value) || 85 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  {isAr ? 'حفظ وإضافة' : 'Save & Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
