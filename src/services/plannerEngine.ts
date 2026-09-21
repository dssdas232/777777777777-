import {
  FactoryConstants,
  SecondaryPlanItem,
  SecondaryPlanCalculatedItem,
  SecondaryPlanTotals,
  PackType,
  SkuBOMFactors,
  PrimaryPlanSummary,
  BlendComponent,
  StemStage,
  CasingIngredient,
  TopFlavorIngredient,
  ActualProductionRecord,
  AdaptiveRecommendation,
  ProductionLine,
} from '../types';

/**
 * TASK 1: Secondary Production Plan
 */
export function calculateSecondaryPlanItem(
  item: SecondaryPlanItem,
  constants: FactoryConstants
): SecondaryPlanCalculatedItem {
  const cartons = item.targetMio * constants.cartonsPerMio; // Target * 100
  const packs = cartons * constants.packsPerCarton; // Cartons * 500
  const sticks = cartons * constants.cigsPerCarton; // Cartons * 10,000 (Target * 1,000,000)
  const tobaccoRequiredKg = (sticks * constants.tobaccoWeightPerStickG) / 1000;

  // Efficiency and line rate
  const effFactor = (item.efficiencyPercent || 85) / 100;
  const ratePerHour = item.lineRateMioPerHour || 0.45;
  const effectiveRate = ratePerHour * effFactor;

  const requiredHours = effectiveRate > 0 ? item.targetMio / effectiveRate : 0;
  const requiredDays = constants.workingHoursPerDay > 0 ? requiredHours / constants.workingHoursPerDay : 0;

  return {
    ...item,
    cartons: Math.round(cartons),
    packs: Math.round(packs),
    sticks: Math.round(sticks),
    tobaccoRequiredKg: Number(tobaccoRequiredKg.toFixed(2)),
    requiredHours: Number(requiredHours.toFixed(1)),
    requiredDays: Number(requiredDays.toFixed(2)),
  };
}

export function calculateSecondaryTotals(
  items: SecondaryPlanCalculatedItem[]
): SecondaryPlanTotals {
  return items.reduce<SecondaryPlanTotals>(
    (acc, curr) => ({
      targetMio: Number((acc.targetMio + curr.targetMio).toFixed(3)),
      cartons: acc.cartons + curr.cartons,
      packs: acc.packs + curr.packs,
      sticks: acc.sticks + curr.sticks,
      tobaccoRequiredKg: Number((acc.tobaccoRequiredKg + curr.tobaccoRequiredKg).toFixed(2)),
      requiredHours: Number((acc.requiredHours + curr.requiredHours).toFixed(1)),
      requiredDays: Number((acc.requiredDays + curr.requiredDays).toFixed(2)),
    }),
    {
      targetMio: 0,
      cartons: 0,
      packs: 0,
      sticks: 0,
      tobaccoRequiredKg: 0,
      requiredHours: 0,
      requiredDays: 0,
    }
  );
}

/**
 * TASK 2: SKU BOM Calculations
 */
export interface SkuBOMRow {
  materialCode: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  ratePerMio: number;
  totalRequired: number;
  isHardOnly?: boolean;
}

export function calculateSkuBOM(
  targetMio: number,
  packType: PackType,
  factors: SkuBOMFactors,
  stickWeightG: number = 0.75
): SkuBOMRow[] {
  const tobaccoKgPerMio = targetMio * 1000000 * (stickWeightG / 1000); // e.g. 750 kg per Mio

  return [
    {
      materialCode: 'CF-01',
      nameAr: 'التبغ المفروم (Cut Filler)',
      nameEn: 'Cut Filler Tobacco',
      unit: 'kg',
      ratePerMio: factors.cutFillerKgPerM * 1000, // 750 kg/Mio
      totalRequired: Number(tobaccoKgPerMio.toFixed(2)),
    },
    {
      materialCode: 'CP-01',
      nameAr: 'ورق السجائر (Cigarette Paper)',
      nameEn: 'Cigarette Paper',
      unit: 'm',
      ratePerMio: factors.cigarettePaperMPerM,
      totalRequired: Number((targetMio * factors.cigarettePaperMPerM).toFixed(1)),
    },
    {
      materialCode: 'FR-01',
      nameAr: 'أعمدة الفلاتر (Filter Rods)',
      nameEn: 'Filter Rods',
      unit: 'pcs',
      ratePerMio: factors.filterRodsPcsPerM,
      totalRequired: Number((targetMio * factors.filterRodsPcsPerM).toFixed(0)),
    },
    {
      materialCode: 'TP-01',
      nameAr: 'ورق التيشينج (Tipping Paper)',
      nameEn: 'Tipping Paper',
      unit: 'pcs/m',
      ratePerMio: factors.tippingPaperPcsPerM,
      totalRequired: Number((targetMio * factors.tippingPaperPcsPerM).toFixed(0)),
    },
    {
      materialCode: 'FA-01',
      nameAr: 'غراء الفلاتر (Filter Adhesive)',
      nameEn: 'Filter Adhesive',
      unit: 'kg',
      ratePerMio: factors.filterAdhesiveKgPerM,
      totalRequired: Number((targetMio * factors.filterAdhesiveKgPerM).toFixed(2)),
    },
    {
      materialCode: 'PB-01',
      nameAr: 'علبة الكرتون الفارغة (Pack Blank)',
      nameEn: 'Pack Blank',
      unit: 'k pcs',
      ratePerMio: factors.packBlankPcsPerM,
      totalRequired: Number((targetMio * factors.packBlankPcsPerM).toFixed(2)),
    },
    {
      materialCode: 'IF-01',
      nameAr: 'الإطار الداخلي (Inner Frame - Hard Only)',
      nameEn: 'Inner Frame (Hard only)',
      unit: 'k pcs',
      ratePerMio: factors.innerFramePcsPerM,
      totalRequired: packType === 'Hard' ? Number((targetMio * factors.innerFramePcsPerM).toFixed(2)) : 0,
      isHardOnly: true,
    },
    {
      materialCode: 'FL-01',
      nameAr: 'ورق القصدير/الألومنيوم (Foil)',
      nameEn: 'Aluminium Foil Inner Liner',
      unit: 'k pcs',
      ratePerMio: factors.foilPcsPerM,
      totalRequired: Number((targetMio * factors.foilPcsPerM).toFixed(2)),
    },
    {
      materialCode: 'BP-01',
      nameAr: 'فيلم السيلوفان (BOPP Film)',
      nameEn: 'BOPP Overwrap Film',
      unit: 'k pcs',
      ratePerMio: factors.boppFilmPcsPerM,
      totalRequired: Number((targetMio * factors.boppFilmPcsPerM).toFixed(2)),
    },
    {
      materialCode: 'TT-01',
      nameAr: 'شريط الفتح (Tear Tape)',
      nameEn: 'Tear Tape',
      unit: 'm',
      ratePerMio: factors.tearTapeMPerM,
      totalRequired: Number((targetMio * factors.tearTapeMPerM).toFixed(2)),
    },
    {
      materialCode: 'TS-01',
      nameAr: 'البندرول الضريبي (Tax Stamp)',
      nameEn: 'Tax Stamp Bandroll',
      unit: 'k pcs',
      ratePerMio: factors.taxStampPcsPerM,
      totalRequired: Number((targetMio * factors.taxStampPcsPerM).toFixed(2)),
    },
    {
      materialCode: 'CB-01',
      nameAr: 'كرتونة التعبئة الخارجية (Carton Blank)',
      nameEn: 'Master Carton Blank',
      unit: 'k pcs',
      ratePerMio: factors.cartonBlankPcsPerM,
      totalRequired: Number((targetMio * factors.cartonBlankPcsPerM).toFixed(3)),
    },
    {
      materialCode: 'CT-01',
      nameAr: 'شريط إغلاق الكراتين (Carton Tape)',
      nameEn: 'Carton Sealing Tape',
      unit: 'm',
      ratePerMio: factors.cartonTapeMPerM,
      totalRequired: Number((targetMio * factors.cartonTapeMPerM).toFixed(2)),
    },
    {
      materialCode: 'ST-01',
      nameAr: 'أشرطة التحزيم (Strapping)',
      nameEn: 'Box Strapping Band',
      unit: 'pcs/m',
      ratePerMio: factors.strappingPcsPerM,
      totalRequired: Number((targetMio * factors.strappingPcsPerM).toFixed(3)),
    },
  ];
}

/**
 * TASK 3: Primary Production Plan
 */
export function calculatePrimaryPlan(
  totalTobaccoDemandKg: number,
  batchSizeKg: number = 10000
): PrimaryPlanSummary {
  const batchesCount = batchSizeKg > 0 ? Math.ceil(totalTobaccoDemandKg / batchSizeKg) : 0;
  const totalProducedKg = batchesCount * batchSizeKg;
  const surplusKg = totalProducedKg - totalTobaccoDemandKg;

  return {
    totalTobaccoDemandKg: Number(totalTobaccoDemandKg.toFixed(2)),
    batchSizeKg,
    batchesCount,
    totalProducedKg: Number(totalProducedKg.toFixed(2)),
    surplusKg: Number(surplusKg.toFixed(2)),
  };
}

/**
 * TASK 4: Blend BOM
 */
export interface CalculatedBlendComponent extends BlendComponent {
  weightPerBatchKg: number;
  totalWeightForPlanKg: number;
}

export function calculateBlendBOM(
  components: BlendComponent[],
  batchSizeKg: number,
  batchesCount: number
): {
  items: CalculatedBlendComponent[];
  totalPercentage: number;
  isBalanced: boolean;
  totalBatchWeightKg: number;
  totalPlanWeightKg: number;
} {
  const totalPercentage = components.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
  const isBalanced = Math.abs(totalPercentage - 100) < 0.01;

  const items: CalculatedBlendComponent[] = components.map((c) => {
    const pct = Number(c.percentage) || 0;
    const weightPerBatchKg = (pct / 100) * batchSizeKg;
    const totalWeightForPlanKg = weightPerBatchKg * batchesCount;

    return {
      ...c,
      weightPerBatchKg: Number(weightPerBatchKg.toFixed(2)),
      totalWeightForPlanKg: Number(totalWeightForPlanKg.toFixed(2)),
    };
  });

  const totalBatchWeightKg = items.reduce((acc, i) => acc + i.weightPerBatchKg, 0);
  const totalPlanWeightKg = items.reduce((acc, i) => acc + i.totalWeightForPlanKg, 0);

  return {
    items,
    totalPercentage: Number(totalPercentage.toFixed(2)),
    isBalanced,
    totalBatchWeightKg: Number(totalBatchWeightKg.toFixed(2)),
    totalPlanWeightKg: Number(totalPlanWeightKg.toFixed(2)),
  };
}

/**
 * TASK 5: Stem BOM
 */
export interface CalculatedStemStage {
  stage: StemStage;
  startWeightKg: number;
  deltaWeightKg: number;
  endWeightKg: number;
  cumulativeYieldPercent: number;
}

export function calculateStemBOM(
  targetStemKg: number,
  yieldPercent: number = 90,
  stages: StemStage[]
): {
  targetStemKg: number;
  yieldPercent: number;
  rawStemRequiredKg: number;
  calculatedStages: CalculatedStemStage[];
  finalOutputKg: number;
  varianceFromTargetKg: number;
} {
  const yieldRatio = (yieldPercent || 90) / 100;
  const rawStemRequiredKg = yieldRatio > 0 ? targetStemKg / yieldRatio : targetStemKg;

  let currentWeight = rawStemRequiredKg;
  const calculatedStages: CalculatedStemStage[] = [];

  for (const st of stages) {
    const startWeightKg = currentWeight;
    const deltaWeightKg = startWeightKg * (st.weightChangePercent / 100);
    const endWeightKg = startWeightKg + deltaWeightKg;
    const cumulativeYieldPercent = rawStemRequiredKg > 0 ? (endWeightKg / rawStemRequiredKg) * 100 : 100;

    calculatedStages.push({
      stage: st,
      startWeightKg: Number(startWeightKg.toFixed(2)),
      deltaWeightKg: Number(deltaWeightKg.toFixed(2)),
      endWeightKg: Number(endWeightKg.toFixed(2)),
      cumulativeYieldPercent: Number(cumulativeYieldPercent.toFixed(1)),
    });

    currentWeight = endWeightKg;
  }

  return {
    targetStemKg: Number(targetStemKg.toFixed(2)),
    yieldPercent,
    rawStemRequiredKg: Number(rawStemRequiredKg.toFixed(2)),
    calculatedStages,
    finalOutputKg: Number(currentWeight.toFixed(2)),
    varianceFromTargetKg: Number((currentWeight - targetStemKg).toFixed(2)),
  };
}

/**
 * TASK 6: Solution BOM
 */
export interface CalculatedIngredient {
  id: string;
  nameAr: string;
  nameEn: string;
  percentage: number;
  weightPerBatchKg: number;
  totalPlanWeightKg: number;
}

export function calculateSolutionBOM(
  batchSizeKg: number,
  batchesCount: number,
  casingAppRatePercent: number = 10,
  topFlavorAppRatePercent: number = 1.2,
  casingIngredients: CasingIngredient[],
  topFlavorIngredients: TopFlavorIngredient[]
) {
  const totalCasingPerBatchKg = batchSizeKg * (casingAppRatePercent / 100);
  const totalCasingPlanKg = totalCasingPerBatchKg * batchesCount;

  const casingItems: CalculatedIngredient[] = casingIngredients.map((ing) => ({
    id: ing.id,
    nameAr: ing.nameAr,
    nameEn: ing.nameEn,
    percentage: ing.percentage,
    weightPerBatchKg: Number(((ing.percentage / 100) * totalCasingPerBatchKg).toFixed(2)),
    totalPlanWeightKg: Number(((ing.percentage / 100) * totalCasingPlanKg).toFixed(2)),
  }));

  const totalTopFlavorPerBatchKg = batchSizeKg * (topFlavorAppRatePercent / 100);
  const totalTopFlavorPlanKg = totalTopFlavorPerBatchKg * batchesCount;

  const topFlavorItems: CalculatedIngredient[] = topFlavorIngredients.map((ing) => ({
    id: ing.id,
    nameAr: ing.nameAr,
    nameEn: ing.nameEn,
    percentage: ing.percentage,
    weightPerBatchKg: Number(((ing.percentage / 100) * totalTopFlavorPerBatchKg).toFixed(3)),
    totalPlanWeightKg: Number(((ing.percentage / 100) * totalTopFlavorPlanKg).toFixed(3)),
  }));

  return {
    casing: {
      applicationRatePercent: casingAppRatePercent,
      totalPerBatchKg: Number(totalCasingPerBatchKg.toFixed(2)),
      totalPlanKg: Number(totalCasingPlanKg.toFixed(2)),
      items: casingItems,
      sumPercentage: casingIngredients.reduce((s, i) => s + i.percentage, 0),
    },
    topFlavor: {
      applicationRatePercent: topFlavorAppRatePercent,
      totalPerBatchKg: Number(totalTopFlavorPerBatchKg.toFixed(3)),
      totalPlanKg: Number(totalTopFlavorPlanKg.toFixed(3)),
      items: topFlavorItems,
      sumPercentage: topFlavorIngredients.reduce((s, i) => s + i.percentage, 0),
    },
  };
}

/**
 * TASK 8: Adaptive Learning Engine
 */
export function analyzeAdaptiveLearning(
  records: ActualProductionRecord[],
  lines: ProductionLine[],
  constants: FactoryConstants
): AdaptiveRecommendation[] {
  // Group records by lineId + skuCode
  const groups: { [key: string]: ActualProductionRecord[] } = {};

  records.forEach((r) => {
    const key = `${r.lineId}_${r.skuCode}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const recommendations: AdaptiveRecommendation[] = [];

  for (const [key, groupRecords] of Object.entries(groups)) {
    if (groupRecords.length >= 5) {
      const [lineId, skuCode] = key.split('_');
      const line = lines.find((l) => l.id === lineId);
      const currentEff = line?.defaultEfficiencyPercent || 85;
      const currentStickWeight = constants.tobaccoWeightPerStickG || 0.75;

      const avgActualEff =
        groupRecords.reduce((acc, r) => acc + r.actualEfficiency, 0) / groupRecords.length;
      const avgActualWeight =
        groupRecords.reduce((acc, r) => acc + r.actualStickWeightG, 0) / groupRecords.length;
      const avgVariance =
        groupRecords.reduce((acc, r) => acc + r.varianceTobaccoPercent, 0) / groupRecords.length;

      // Suggest adjusted baseline
      const suggestedEfficiency = Number(avgActualEff.toFixed(1));
      const suggestedStickWeightG = Number(avgActualWeight.toFixed(3));

      const isDiff =
        Math.abs(suggestedEfficiency - currentEff) >= 1.0 ||
        Math.abs(suggestedStickWeightG - currentStickWeight) >= 0.005;

      if (isDiff) {
        recommendations.push({
          lineId,
          skuCode,
          sampleCount: groupRecords.length,
          currentEfficiency: currentEff,
          suggestedEfficiency,
          currentStickWeightG: currentStickWeight,
          suggestedStickWeightG,
          varianceTrend: avgVariance > 0 ? 'declining' : 'improving',
          avgVariancePercent: Number(avgVariance.toFixed(2)),
          explanationAr: `بناءً على ${groupRecords.length} سجلات فعلية لخط ${line?.name || lineId} والمنتج ${skuCode}: متوسط الكفاءة الفعلي كان ${suggestedEfficiency}% مقارنة بـ ${currentEff}% المخططة، ومتوسط وزن السيجارة الفعلي بلغ ${suggestedStickWeightG} غم مقارنة بـ ${currentStickWeight} غم. يُنصح بتحديث افتراضات الخط لتحسين دقة التخطيط.`,
          explanationEn: `Based on ${groupRecords.length} actual runs for ${line?.name || lineId} & SKU ${skuCode}: average actual efficiency was ${suggestedEfficiency}% vs ${currentEff}% planned, and actual stick weight averaged ${suggestedStickWeightG}g vs ${currentStickWeight}g planned. Updating baseline will calibrate future schedules.`,
          status: 'pending',
        });
      }
    }
  }

  return recommendations;
}
