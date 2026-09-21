import React, { useState } from 'react';
import {
  Layers,
  Edit3,
  Download,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  RotateCcw,
} from 'lucide-react';
import {
  Language,
  SecondaryPlanItem,
  SkuBOMFactors,
  ProductionLine,
} from '../types';
import { calculateSkuBOM } from '../services/plannerEngine';
import { eventBus } from '../services/eventBus';

interface Task2SkuBOMProps {
  language: Language;
  planItems: SecondaryPlanItem[];
  lines: ProductionLine[];
  bomFactors: SkuBOMFactors;
  onUpdateBOMFactors: (factors: SkuBOMFactors) => void;
}

export const Task2SkuBOM: React.FC<Task2SkuBOMProps> = ({
  language,
  planItems,
  lines,
  bomFactors,
  onUpdateBOMFactors,
}) => {
  const isAr = language === 'ar';

  const [selectedSkuId, setSelectedSkuId] = useState<string>(
    planItems[0]?.id || ''
  );
  const [factors, setFactors] = useState<SkuBOMFactors>(bomFactors);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const selectedItem = planItems.find((i) => i.id === selectedSkuId) || planItems[0];
  const assignedLine = lines.find((l) => l.id === selectedItem?.lineId);

  const bomRows = selectedItem
    ? calculateSkuBOM(selectedItem.targetMio, selectedItem.packType, factors)
    : [];

  const handleFactorChange = (key: keyof SkuBOMFactors, value: number) => {
    const updated = { ...factors, [key]: value };
    setFactors(updated);
  };

  const handleSaveFactors = () => {
    onUpdateBOMFactors(factors);
    setIsSavedNotice(true);
    eventBus.setNodeStatus('task-2', 'Running', 1200);
    eventBus.addEventLog({
      source: 'Task 2: SKU BOM',
      eventType: 'TOOL_EXECUTION',
      message: `BOM factors updated and synchronized for SKU: ${selectedItem?.skuCode || 'All'}.`,
      status: 'success',
    });
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const exportBOMToCSV = () => {
    if (!selectedItem) return;
    const headers = ['Material Code', 'Material Name', 'Unit', 'Rate Per Million', 'Total Required'];
    const rows = bomRows.map((r) => [
      r.materialCode,
      `"${isAr ? r.nameAr : r.nameEn}"`,
      r.unit,
      r.ratePerMio,
      r.totalRequired,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        `SKU Code: ${selectedItem.skuCode}, SKU Name: ${selectedItem.skuName}, Target: ${selectedItem.targetMio} Mio, Pack: ${selectedItem.packType}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOM_${selectedItem.skuCode}_${new Date().toISOString().slice(0, 10)}.csv`);
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
              {isAr ? 'المهمة 2: فاتورة المواد لكل منتج وخط (SKU & Line BOM)' : 'Task 2: SKU & Line Bill of Materials (BOM)'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {isAr ? '14 مادة أولية ومواد تغليف' : '14 Raw & Packaging Materials'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'معدلات الاستهلاك المعيارية لكل 1 مليون سيجارة مع إمكانية التعديل وحساب الاحتياج الكلي فورياً'
              : 'Standard consumption factors per 1 Million Cigarettes with real-time recalculation of total demands'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSavedNotice && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              {isAr ? 'تم حفظ المعايير' : 'Factors Saved'}
            </span>
          )}
          <button
            onClick={handleSaveFactors}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isAr ? 'حفظ وتطبيق المعايير' : 'Apply BOM Standards'}</span>
          </button>
          <button
            onClick={exportBOMToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'تصدير BOM' : 'Export BOM'}</span>
          </button>
        </div>
      </div>

      {/* SKU Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {planItems.map((item) => {
          const isSelected = item.id === (selectedItem?.id || '');
          return (
            <button
              key={item.id}
              onClick={() => setSelectedSkuId(item.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                isSelected
                  ? 'bg-slate-700 text-amber-400 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>{item.skuCode}: {item.skuName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300">
                {item.targetMio} M
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected SKU Metadata Card */}
      {selectedItem && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <div>
            <div className="text-xs text-slate-400">{isAr ? 'المنتج المحدد' : 'Selected SKU'}</div>
            <div className="text-base font-bold text-white mt-0.5">{selectedItem.skuName}</div>
            <div className="text-xs font-mono text-amber-400">{selectedItem.skuCode}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{isAr ? 'نوع العبوة' : 'Pack Specification'}</div>
            <div className="text-sm font-semibold text-cyan-300 mt-0.5">
              {selectedItem.packType === 'Hard' ? 'Hard Pack (HLP)' : 'Soft Pack (SP)'}
            </div>
            <div className="text-xs text-slate-400">
              {selectedItem.packType === 'Hard'
                ? isAr ? 'يتطلب إطار داخلي (Inner Frame)' : 'Includes Inner Frame'
                : isAr ? 'بدون إطار داخلي' : 'No Inner Frame Required'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{isAr ? 'خط الإنتاج المعين' : 'Assigned Line'}</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {assignedLine?.name || selectedItem.lineId}
            </div>
            <div className="text-xs text-slate-400">
              {isAr ? 'السرعة' : 'Speed'}: {assignedLine?.speedSticksPerMin.toLocaleString()} {isAr ? 'سيجارة/دقيقة' : 'cigs/min'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{isAr ? 'حجم الطلب المستهدف' : 'Target Volume'}</div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">
              {selectedItem.targetMio.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">{isAr ? 'مليون سيجارة' : 'Mio Cigarettes'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Editable BOM Table */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="p-3 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {isAr ? 'جدول حساب المواد الأولية والتعبئة' : 'Material Consumption & Requirement Matrix'}
          </span>
          <span className="text-xs text-slate-400">
            {isAr ? 'يمكنك تعديل المعاملات بالعمود أدناه' : 'Factors can be adjusted in the rate column'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-300 border-b border-slate-700 text-xs uppercase font-semibold">
                <th className="p-3">{isAr ? 'كود المادة' : 'Material Code'}</th>
                <th className="p-3">{isAr ? 'اسم المادة' : 'Material Description'}</th>
                <th className="p-3">{isAr ? 'الوحدة' : 'Unit'}</th>
                <th className="p-3 text-amber-300">{isAr ? 'المعامل لكل مليون سيجارة (Rate/M)' : 'Rate / 1M Cigarettes'}</th>
                <th className="p-3 text-emerald-300">{isAr ? 'إجمالي المطلوب لهذا الهدف' : 'Total Required'}</th>
                <th className="p-3">{isAr ? 'ملاحظة تشغيلية' : 'Specification Note'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {bomRows.map((row) => {
                const isInnerFrame = row.materialCode === 'IF-01';
                const isDisabled = isInnerFrame && selectedItem?.packType !== 'Hard';

                return (
                  <tr
                    key={row.materialCode}
                    className={`hover:bg-slate-700/30 transition-colors ${
                      isDisabled ? 'opacity-40 bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-amber-400">{row.materialCode}</td>
                    <td className="p-3 font-medium text-slate-200">{isAr ? row.nameAr : row.nameEn}</td>
                    <td className="p-3 text-slate-400 font-mono">{row.unit}</td>

                    {/* Editable Rate Input */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step={row.ratePerMio < 1 ? '0.01' : '1'}
                          value={row.ratePerMio}
                          disabled={isDisabled}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            // map to factor key
                            if (row.materialCode === 'CF-01') handleFactorChange('cutFillerKgPerM', val / 1000);
                            else if (row.materialCode === 'CP-01') handleFactorChange('cigarettePaperMPerM', val);
                            else if (row.materialCode === 'FR-01') handleFactorChange('filterRodsPcsPerM', val);
                            else if (row.materialCode === 'TP-01') handleFactorChange('tippingPaperPcsPerM', val);
                            else if (row.materialCode === 'FA-01') handleFactorChange('filterAdhesiveKgPerM', val);
                            else if (row.materialCode === 'PB-01') handleFactorChange('packBlankPcsPerM', val);
                            else if (row.materialCode === 'IF-01') handleFactorChange('innerFramePcsPerM', val);
                            else if (row.materialCode === 'FL-01') handleFactorChange('foilPcsPerM', val);
                            else if (row.materialCode === 'BP-01') handleFactorChange('boppFilmPcsPerM', val);
                            else if (row.materialCode === 'TT-01') handleFactorChange('tearTapeMPerM', val);
                            else if (row.materialCode === 'TS-01') handleFactorChange('taxStampPcsPerM', val);
                            else if (row.materialCode === 'CB-01') handleFactorChange('cartonBlankPcsPerM', val);
                            else if (row.materialCode === 'CT-01') handleFactorChange('cartonTapeMPerM', val);
                            else if (row.materialCode === 'ST-01') handleFactorChange('strappingPcsPerM', val);
                          }}
                          className={`bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs w-28 text-white focus:border-amber-400 focus:outline-none ${
                            isDisabled ? 'cursor-not-allowed bg-slate-950' : ''
                          }`}
                        />
                        <span className="text-[11px] text-slate-400">/{row.unit}</span>
                      </div>
                    </td>

                    {/* Total Required */}
                    <td className="p-3">
                      <span className="text-emerald-400 font-bold text-sm">
                        {row.totalRequired.toLocaleString()}
                      </span>{' '}
                      <span className="text-xs text-slate-400">{row.unit}</span>
                    </td>

                    {/* Operational Note */}
                    <td className="p-3 text-xs text-slate-400">
                      {isInnerFrame && selectedItem?.packType !== 'Hard' ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isAr ? 'ملغى: العبوة رخوة (Soft Pack)' : 'N/A for Soft Pack'}
                        </span>
                      ) : row.materialCode === 'TS-01' ? (
                        isAr ? 'طابع ضريبي رسمي 50 ألف/مليون' : '50k tax stamps / Mio'
                      ) : row.materialCode === 'CF-01' ? (
                        isAr ? 'محسوب حسب وزن السيجارة المخصص' : 'Derived from stick weight'
                      ) : (
                        isAr ? 'معيار تشغيلي قابل للمعايرة' : 'Standard consumption baseline'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
