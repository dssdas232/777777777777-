// Service for parsing, analyzing, and exporting Excel production plans
import * as XLSX from 'xlsx';
import { SecondaryPlanItem, FactoryConstants } from '../types';

export interface ExcelPlanSummary {
  fileName: string;
  totalItems: number;
  totalMio: number;
  totalCartons: number;
  totalPacks: number;
  totalSticks: number;
  totalTobaccoRequiredKg: number;
  primaryBatchesCount: number;
  linesUsed: string[];
  warnings: string[];
}

export interface ExcelParseResult {
  success: boolean;
  summary: ExcelPlanSummary;
  items: SecondaryPlanItem[];
  rawRows: any[];
  error?: string;
}

// Normalize column headers to match multiple languages and variations
function findColumnValue(row: Record<string, any>, possibleNames: string[]): any {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const cleanName = name.toLowerCase().replace(/[\s_\-#\(\)]/g, '');
    for (const key of keys) {
      const cleanKey = key.toLowerCase().replace(/[\s_\-#\(\)]/g, '');
      if (cleanKey === cleanName || cleanKey.includes(cleanName) || cleanName.includes(cleanKey)) {
        return row[key];
      }
    }
  }
  return undefined;
}

export const excelService = {
  // Parse any uploaded Excel file (.xlsx, .xls, .csv)
  async parseExcelFile(file: File, constants: FactoryConstants): Promise<ExcelParseResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Use the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          summary: this.getEmptySummary(file.name),
          items: [],
          rawRows: [],
          error: 'الملف فارغ ولا يحتوي على أوراق عمل (Worksheets)',
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        return {
          success: false,
          summary: this.getEmptySummary(file.name),
          items: [],
          rawRows: [],
          error: 'ورقة العمل فارغة ولا تحتوي على صفوف بيانات',
        };
      }

      const items: SecondaryPlanItem[] = [];
      const warnings: string[] = [];
      const linesSet = new Set<string>();

      rawRows.forEach((row, index) => {
        // 1. Extract SKU code
        let skuCode = findColumnValue(row, [
          'sku',
          'skucode',
          'رمز الصنف',
          'كود الصنف',
          'رمز المنتج',
          'code',
          'item',
          'id',
        ]);
        if (!skuCode) {
          skuCode = `SKU-${String(index + 1).padStart(3, '0')}`;
        }
        skuCode = String(skuCode).trim();

        // 2. Extract Product Name
        let name = findColumnValue(row, [
          'productname',
          'name',
          'اسم الصنف',
          'اسم المنتج',
          'المنتج',
          'brand',
          'العلامة التجارية',
        ]);
        if (!name) {
          name = `Product ${skuCode}`;
        }
        name = String(name).trim();

        // 3. Extract Target Mio or Quantity
        let targetMioRaw = findColumnValue(row, [
          'targetmio',
          'mio',
          'الكمية بالملايين',
          'الكمية (مليون)',
          'كمية',
          'الكمية',
          'target',
          'quantity',
          'million',
        ]);

        let targetMio = 0;
        if (targetMioRaw !== undefined && targetMioRaw !== '') {
          targetMio = parseFloat(String(targetMioRaw).replace(/[^0-9.-]/g, ''));
        }

        // If targetMio not provided, check if Cartons or Sticks were provided
        if (isNaN(targetMio) || targetMio <= 0) {
          const cartonsRaw = findColumnValue(row, ['cartons', 'كراتين', 'الكراتين', 'عدد الكراتين']);
          if (cartonsRaw) {
            const cartons = parseFloat(String(cartonsRaw).replace(/[^0-9.-]/g, ''));
            if (!isNaN(cartons) && cartons > 0) {
              targetMio = cartons / constants.cartonsPerMio;
            }
          }
        }

        if (isNaN(targetMio) || targetMio <= 0) {
          warnings.push(`الصف ${index + 2}: لم يتم العثور على كمية صالحة للصنف ${skuCode}. تم افتراض 10 مليون.`);
          targetMio = 10;
        }

        // 4. Extract Line Unit (LU#)
        let lineId = findColumnValue(row, [
          'line',
          'lineid',
          'lu',
          'luid',
          'خط الإنتاج',
          'رقم الخط',
          'خط',
          'وحدة الإنتاج',
        ]);
        if (!lineId) {
          lineId = `LU#0${(index % 5) + 1}`;
        } else {
          lineId = String(lineId).trim().toUpperCase();
          if (!lineId.startsWith('LU#')) {
            const num = lineId.replace(/[^0-9]/g, '');
            lineId = num ? `LU#${num.padStart(2, '0')}` : 'LU#01';
          }
        }
        linesSet.add(lineId);

        // 5. Extract Pack Type
        let packTypeRaw = findColumnValue(row, [
          'packtype',
          'نوع العلبة',
          'نوع التعبئة',
          'العلبة',
          'type',
          'packing',
        ]);
        const packType: 'Hard' | 'Soft' =
          String(packTypeRaw || '').toLowerCase().includes('soft') || String(packTypeRaw || '').includes('رخوة')
            ? 'Soft'
            : 'Hard';

        // 6. Calculate derivatives based on constants
        const cartons = targetMio * constants.cartonsPerMio;
        const packs = cartons * constants.packsPerCarton;
        const sticks = targetMio * 1000000;
        const tobaccoRequiredKg = (sticks * constants.tobaccoWeightPerStickG) / 1000;

        items.push({
          id: `item-${Date.now()}-${index}`,
          skuCode,
          skuName: name,
          targetMio,
          lineId,
          packType,
          cartons,
          packs,
          sticks,
          tobaccoRequiredKg,
          lineRateMioPerHour: 0.45,
          efficiencyPercent: 85,
        });
      });

      // Calculate overall summary
      const totalMio = items.reduce((sum, item) => sum + item.targetMio, 0);
      const totalCartons = items.reduce((sum, item) => sum + (item.cartons || 0), 0);
      const totalPacks = items.reduce((sum, item) => sum + (item.packs || 0), 0);
      const totalSticks = items.reduce((sum, item) => sum + (item.sticks || 0), 0);
      const totalTobaccoRequiredKg = items.reduce((sum, item) => sum + (item.tobaccoRequiredKg || 0), 0);
      const primaryBatchesCount = Math.ceil(totalTobaccoRequiredKg / constants.blendBatchSizeKg);

      const summary: ExcelPlanSummary = {
        fileName: file.name,
        totalItems: items.length,
        totalMio,
        totalCartons,
        totalPacks,
        totalSticks,
        totalTobaccoRequiredKg,
        primaryBatchesCount,
        linesUsed: Array.from(linesSet),
        warnings,
      };

      return {
        success: true,
        summary,
        items,
        rawRows,
      };
    } catch (err: any) {
      console.error('Excel parsing error:', err);
      return {
        success: false,
        summary: this.getEmptySummary(file.name),
        items: [],
        rawRows: [],
        error: `فشل قراءة ملف الإكسل: ${err?.message || 'تنسيق غير مدعوم'}`,
      };
    }
  },

  getEmptySummary(fileName: string): ExcelPlanSummary {
    return {
      fileName,
      totalItems: 0,
      totalMio: 0,
      totalCartons: 0,
      totalPacks: 0,
      totalSticks: 0,
      totalTobaccoRequiredKg: 0,
      primaryBatchesCount: 0,
      linesUsed: [],
      warnings: [],
    };
  },

  // Generate and download a standard Excel template ready for user input
  downloadTemplate(): void {
    const templateData = [
      {
        'رمز الصنف (SKU Code)': 'SKU-001',
        'اسم المنتج (Product Name)': 'Classic Red 20s Hard Pack',
        'الكمية بالملايين (Target Mio)': 25.0,
        'خط الإنتاج (Line Unit)': 'LU#01',
        'نوع العلبة (Pack Type)': 'Hard Pack',
      },
      {
        'رمز الصنف (SKU Code)': 'SKU-002',
        'اسم المنتج (Product Name)': 'Gold Lights 20s Hard Pack',
        'الكمية بالملايين (Target Mio)': 20.0,
        'خط الإنتاج (Line Unit)': 'LU#02',
        'نوع العلبة (Pack Type)': 'Hard Pack',
      },
      {
        'رمز الصنف (SKU Code)': 'SKU-003',
        'اسم المنتج (Product Name)': 'Soft Pack Heritage Virginia',
        'الكمية بالملايين (Target Mio)': 15.0,
        'خط الإنتاج (Line Unit)': 'LU#03',
        'نوع العلبة (Pack Type)': 'Soft Cup',
      },
      {
        'رمز الصنف (SKU Code)': 'SKU-004',
        'اسم المنتج (Product Name)': 'Silver Ultra Lights 20s',
        'الكمية بالملايين (Target Mio)': 12.0,
        'خط الإنتاج (Line Unit)': 'LU#04',
        'نوع العلبة (Pack Type)': 'Hard Pack',
      },
      {
        'رمز الصنف (SKU Code)': 'SKU-005',
        'اسم المنتج (Product Name)': 'Ice Click Fresh Menthol',
        'الكمية بالملايين (Target Mio)': 8.0,
        'خط الإنتاج (Line Unit)': 'LU#01',
        'نوع العلبة (Pack Type)': 'Hard Pack',
      },
      {
        'رمز الصنف (SKU Code)': 'SKU-006',
        'اسم المنتج (Product Name)': 'Super Slims Velvet Blue',
        'الكمية بالملايين (Target Mio)': 10.0,
        'خط الإنتاج (Line Unit)': 'LU#05',
        'نوع العلبة (Pack Type)': 'Slims Hard Pack',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Format column widths
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Secondary_Production_Plan');

    XLSX.writeFile(workbook, 'Cigarette_Production_Plan_Template.xlsx');
  },

  // Export current active plan into an Excel file
  exportPlan(planItems: SecondaryPlanItem[], constants: FactoryConstants): void {
    const exportData = planItems.map((item, idx) => ({
      '#': idx + 1,
      'رمز الصنف (SKU)': item.skuCode,
      'اسم المنتج (Product)': item.skuName,
      'نوع العلبة (Pack Type)': item.packType,
      'خط التجهيز (Line LU#)': item.lineId,
      'الكمية المستهدفة (ملايين سيجارة)': item.targetMio,
      'إجمالي الكراتين (Cartons)': (item.targetMio * constants.cartonsPerMio).toLocaleString(),
      'إجمالي العلب (Packs)': (item.targetMio * constants.cartonsPerMio * constants.packsPerCarton).toLocaleString(),
      'عدد السجائر (Sticks)': (item.targetMio * 1000000).toLocaleString(),
      'التبغ المطلوب كغم (Tobacco Kg)': Math.round((item.targetMio * 1000000 * constants.tobaccoWeightPerStickG) / 1000).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Active_Production_Plan');
    XLSX.writeFile(workbook, `Factory_Production_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
};
