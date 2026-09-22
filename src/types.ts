/**
 * Cigarette Factory AI Production Planner - Type Definitions
 */

export type Language = 'ar' | 'en';

export type ActiveTab =
  | 'main'
  | 'task1'
  | 'task2'
  | 'task3'
  | 'task4'
  | 'task5'
  | 'task6'
  | 'task7'
  | 'task8'
  | 'task9'
  | 'task10'
  | 'task11';

export interface FactoryConstants {
  cigsPerPack: number; // 20
  cigsPerCarton: number; // 10,000
  packsPerCarton: number; // 500
  cartonsPerMio: number; // 100
  blendBatchSizeKg: number; // 10,000 kg
  tobaccoWeightPerStickG: number; // 0.75 g
  workingHoursPerDay: number; // 16 or 24 h
}

export type PackType = 'Hard' | 'Soft';

export interface ProductionLine {
  id: string;
  name: string;
  speedSticksPerMin: number; // e.g. 8000
  defaultEfficiencyPercent: number; // e.g. 85
  efficiencyPercent?: number; // active tuned efficiency
}

export interface SecondaryPlanItem {
  id: string;
  skuCode: string;
  skuName: string;
  packType: PackType;
  lineId: string;
  targetMio: number; // Target in Million Cigarettes
  lineRateMioPerHour: number; // calculated or custom
  efficiencyPercent: number; // e.g. 85
  cartons?: number;
  packs?: number;
  sticks?: number;
  tobaccoRequiredKg?: number;
}

export interface SecondaryPlanCalculatedItem extends SecondaryPlanItem {
  cartons: number;
  packs: number;
  sticks: number;
  tobaccoRequiredKg: number;
  requiredHours: number;
  requiredDays: number;
}

export interface SecondaryPlanTotals {
  targetMio: number;
  cartons: number;
  packs: number;
  sticks: number;
  tobaccoRequiredKg: number;
  requiredHours: number;
  requiredDays: number;
}

export interface SkuBOMFactors {
  cutFillerKgPerM: number; // default 0.75 kg/M or stick-based
  cigarettePaperMPerM: number; // 1050 m/M
  filterRodsPcsPerM: number; // 1015 pcs/M
  tippingPaperPcsPerM: number; // 1015 m or pcs/M
  filterAdhesiveKgPerM: number; // 0.05 kg/M
  packBlankPcsPerM: number; // 50.5 k pcs/M
  innerFramePcsPerM: number; // 50.5 k pcs/M (Hard only)
  foilPcsPerM: number; // 50.5 k pcs/M
  boppFilmPcsPerM: number; // 50.5 k pcs/M
  tearTapeMPerM: number; // 5.05 m/M
  taxStampPcsPerM: number; // 50 pcs/M (k pcs)
  cartonBlankPcsPerM: number; // 0.1 k pcs/M (100 pcs)
  cartonTapeMPerM: number; // 0.15 m/M
  strappingPcsPerM: number; // 0.02 m or pcs/M
}

export interface PrimaryPlanSummary {
  totalTobaccoDemandKg: number;
  batchSizeKg: number;
  batchesCount: number;
  totalProducedKg: number;
  surplusKg: number;
}

export interface BatchScheduleItem {
  batchNumber: number;
  batchCode: string;
  scheduledDate: string;
  shift: string;
  targetKg: number;
  actualKg?: number;
  siloId: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Pending';
  variancePercent?: number;
}

export type BlendGrade =
  | 'BU'
  | 'FU'
  | 'OR'
  | 'CL'
  | 'RE'
  | 'IS'
  | 'SL'
  | 'ET'
  | 'TL'
  | '12*'
  | '10*'
  | 'LD'
  | 'DB';

export interface BlendComponent {
  code: BlendGrade;
  nameAr: string;
  nameEn: string;
  percentage: number;
}

export interface StemStage {
  id: string;
  nameAr: string;
  nameEn: string;
  weightChangePercent: number; // -5, -3, 0, +4, -2
  descriptionAr: string;
  descriptionEn: string;
}

export interface CasingIngredient {
  id: string;
  nameAr: string;
  nameEn: string;
  percentage: number;
}

export interface TopFlavorIngredient {
  id: string;
  nameAr: string;
  nameEn: string;
  percentage: number;
}

export interface ActualProductionRecord {
  id: string;
  timestamp: string;
  skuCode: string;
  lineId: string;
  plannedTargetMio: number;
  actualProducedMio: number;
  plannedTobaccoKg: number;
  actualTobaccoKg: number;
  plannedEfficiency: number;
  actualEfficiency: number;
  plannedStickWeightG: number;
  actualStickWeightG: number;
  varianceTobaccoPercent: number;
  varianceOutputPercent: number;
  varianceEfficiencyPercent: number;
  notes?: string;
}

export interface AdaptiveRecommendation {
  lineId: string;
  skuCode: string;
  sampleCount: number;
  currentEfficiency: number;
  suggestedEfficiency: number;
  currentStickWeightG: number;
  suggestedStickWeightG: number;
  varianceTrend: 'improving' | 'declining' | 'stable';
  avgVariancePercent: number;
  explanationAr: string;
  explanationEn: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string; // 'User' | 'AI Agent' | 'Adaptive Engine' | 'A2A: ERP'
  section: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  reason?: string;
}

export type NodeStatus = 'Idle' | 'Running' | 'Success' | 'Error' | 'Completed';

export interface AgentNode {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
  status: NodeStatus;
  descriptionAr: string;
  descriptionEn: string;
  lastActive: string;
  isPaused: boolean;
}

export interface AgentEventLog {
  id: string;
  timestamp: string;
  source: string;
  eventType:
    | 'TOOL_EXECUTION'
    | 'A2A_MESSAGE'
    | 'ADAPTIVE_LEARNING'
    | 'DB_SYNC'
    | 'USER_ACTION'
    | 'USER_OVERRIDE'
    | 'STATE_MUTATION';
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  payload?: any;
}

export type LiveEventLog = AgentEventLog;
export type AgentArchitectureNode = AgentNode;

export interface AgentMetrics {
  latencyMs: number;
  memoryHeapMb: number;
  activeTasks: number;
  totalProcessed: number;
}

export interface ConnectedAgent {
  id: string;
  name: string;
  type: 'ERP' | 'PROCUREMENT' | 'QUALITY' | 'LOGISTICS' | 'CUSTOM';
  endpoint: string;
  protocol: 'A2A-JSON-RPC-2.0' | 'A2A-REST-v1';
  status: 'online' | 'idle' | 'offline';
  lastPing: string;
  totalExchanges: number;
}

export interface A2ARequestMessage {
  id: string;
  timestamp: string;
  direction: 'INCOMING' | 'OUTGOING';
  agentName: string;
  method: string;
  payload: any;
  responseStatus: 'SUCCESS' | 'ERROR';
  executionTimeMs: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}
