import {
  FactoryConstants,
  SecondaryPlanItem,
  SkuBOMFactors,
  BlendComponent,
  StemStage,
  CasingIngredient,
  TopFlavorIngredient,
  ActualProductionRecord,
  AuditLogEntry,
  ConnectedAgent,
  A2ARequestMessage,
  ProductionLine,
  BatchScheduleItem,
} from '../types';

import {
  DEFAULT_FACTORY_CONSTANTS,
  DEFAULT_PRODUCTION_LINES,
  INITIAL_SECONDARY_PLAN,
  DEFAULT_SKU_BOM_FACTORS,
  DEFAULT_BLEND_COMPONENTS,
  DEFAULT_STEM_STAGES,
  DEFAULT_CASING_INGREDIENTS,
  DEFAULT_TOP_FLAVOR_INGREDIENTS,
  INITIAL_CONNECTED_AGENTS,
  SAMPLE_ACTUAL_RECORDS,
  INITIAL_AUDIT_LOGS,
} from '../data/defaults';

import { eventBus } from './eventBus';

const STORAGE_KEYS = {
  CONSTANTS: 'cig_ai_constants_v2',
  LINES: 'cig_ai_lines_v2',
  SECONDARY_PLAN: 'cig_ai_sec_plan_v2',
  BOM_FACTORS: 'cig_ai_bom_factors_v2',
  BLEND: 'cig_ai_blend_v2',
  STEM_STAGES: 'cig_ai_stem_stages_v2',
  STEM_YIELD: 'cig_ai_stem_yield_v2',
  CASING_RATE: 'cig_ai_casing_rate_v2',
  TOP_FLAVOR_RATE: 'cig_ai_top_flavor_rate_v2',
  CASING_ING: 'cig_ai_casing_ing_v2',
  TOP_FLAVOR_ING: 'cig_ai_top_flavor_ing_v2',
  ACTUAL_RECORDS: 'cig_ai_actual_records_v2',
  AUDIT_LOGS: 'cig_ai_audit_logs_v2',
  CONNECTED_AGENTS: 'cig_ai_connected_agents_v2',
  A2A_MESSAGES: 'cig_ai_a2a_msgs_v2',
  BATCH_SCHEDULE: 'cig_ai_batch_schedule_v2',
};

function loadItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (e) {
    console.warn(`Error loading key ${key}:`, e);
    return fallback;
  }
}

function saveItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    eventBus.recordDbAction('write');
  } catch (e) {
    console.warn(`Error saving key ${key}:`, e);
  }
}

class StorageService {
  // Constants
  public getConstants(): FactoryConstants {
    eventBus.recordDbAction('read');
    return loadItem<FactoryConstants>(STORAGE_KEYS.CONSTANTS, DEFAULT_FACTORY_CONSTANTS);
  }

  public saveConstants(constants: FactoryConstants, actor: string = 'User'): void {
    const old = this.getConstants();
    saveItem(STORAGE_KEYS.CONSTANTS, constants);
    this.addAuditLog({
      actor,
      section: 'Factory Constants',
      fieldChanged: 'Constants Updated',
      oldValue: `StickWeight: ${old.tobaccoWeightPerStickG}g, BatchSize: ${old.blendBatchSizeKg}kg`,
      newValue: `StickWeight: ${constants.tobaccoWeightPerStickG}g, BatchSize: ${constants.blendBatchSizeKg}kg`,
      reason: 'User / Settings change',
    });
  }

  // Lines
  public getLines(): ProductionLine[] {
    eventBus.recordDbAction('read');
    return loadItem<ProductionLine[]>(STORAGE_KEYS.LINES, DEFAULT_PRODUCTION_LINES);
  }

  public saveLines(lines: ProductionLine[]): void {
    saveItem(STORAGE_KEYS.LINES, lines);
  }

  // Secondary Plan
  public getSecondaryPlan(): SecondaryPlanItem[] {
    eventBus.recordDbAction('read');
    return loadItem<SecondaryPlanItem[]>(STORAGE_KEYS.SECONDARY_PLAN, INITIAL_SECONDARY_PLAN);
  }

  public saveSecondaryPlan(items: SecondaryPlanItem[], actor: string = 'User', reason?: string): void {
    saveItem(STORAGE_KEYS.SECONDARY_PLAN, items);
    this.addAuditLog({
      actor,
      section: 'Secondary Production Plan',
      fieldChanged: 'Plan SKU List & Targets',
      oldValue: 'Previous targets',
      newValue: `${items.length} active SKUs, Total Target: ${items.reduce((s, i) => s + i.targetMio, 0).toFixed(1)} Mio`,
      reason: reason || 'Production schedule update',
    });
  }

  // SKU BOM Factors
  public getSkuBOMFactors(): SkuBOMFactors {
    eventBus.recordDbAction('read');
    return loadItem<SkuBOMFactors>(STORAGE_KEYS.BOM_FACTORS, DEFAULT_SKU_BOM_FACTORS);
  }

  public saveSkuBOMFactors(factors: SkuBOMFactors, actor: string = 'User'): void {
    const old = this.getSkuBOMFactors();
    saveItem(STORAGE_KEYS.BOM_FACTORS, factors);
    this.addAuditLog({
      actor,
      section: 'SKU BOM Factors',
      fieldChanged: 'BOM Rates',
      oldValue: `Paper: ${old.cigarettePaperMPerM}m, Filter: ${old.filterRodsPcsPerM}`,
      newValue: `Paper: ${factors.cigarettePaperMPerM}m, Filter: ${factors.filterRodsPcsPerM}`,
      reason: 'Material specification change',
    });
  }

  // Blend BOM
  public getBlendComponents(): BlendComponent[] {
    eventBus.recordDbAction('read');
    return loadItem<BlendComponent[]>(STORAGE_KEYS.BLEND, DEFAULT_BLEND_COMPONENTS);
  }

  public saveBlendComponents(components: BlendComponent[], actor: string = 'User'): void {
    saveItem(STORAGE_KEYS.BLEND, components);
    this.addAuditLog({
      actor,
      section: 'Blend BOM',
      fieldChanged: 'Tobacco Blend Formulation',
      oldValue: 'Previous formulation',
      newValue: components.map((c) => `${c.code}:${c.percentage}%`).join(' | '),
      reason: 'Recipe optimization / leaf allocation',
    });
  }

  // Stem BOM
  public getStemStages(): StemStage[] {
    eventBus.recordDbAction('read');
    return loadItem<StemStage[]>(STORAGE_KEYS.STEM_STAGES, DEFAULT_STEM_STAGES);
  }

  public saveStemStages(stages: StemStage[]): void {
    saveItem(STORAGE_KEYS.STEM_STAGES, stages);
  }

  public getStemYield(): number {
    return loadItem<number>(STORAGE_KEYS.STEM_YIELD, 90);
  }

  public saveStemYield(yieldPercent: number): void {
    saveItem(STORAGE_KEYS.STEM_YIELD, yieldPercent);
  }

  // Solution BOM
  public getCasingRate(): number {
    return loadItem<number>(STORAGE_KEYS.CASING_RATE, 10);
  }

  public saveCasingRate(rate: number): void {
    saveItem(STORAGE_KEYS.CASING_RATE, rate);
  }

  public getTopFlavorRate(): number {
    return loadItem<number>(STORAGE_KEYS.TOP_FLAVOR_RATE, 1.2);
  }

  public saveTopFlavorRate(rate: number): void {
    saveItem(STORAGE_KEYS.TOP_FLAVOR_RATE, rate);
  }

  public getCasingIngredients(): CasingIngredient[] {
    eventBus.recordDbAction('read');
    return loadItem<CasingIngredient[]>(STORAGE_KEYS.CASING_ING, DEFAULT_CASING_INGREDIENTS);
  }

  public saveCasingIngredients(items: CasingIngredient[]): void {
    saveItem(STORAGE_KEYS.CASING_ING, items);
  }

  public getTopFlavorIngredients(): TopFlavorIngredient[] {
    eventBus.recordDbAction('read');
    return loadItem<TopFlavorIngredient[]>(STORAGE_KEYS.TOP_FLAVOR_ING, DEFAULT_TOP_FLAVOR_INGREDIENTS);
  }

  public saveTopFlavorIngredients(items: TopFlavorIngredient[]): void {
    saveItem(STORAGE_KEYS.TOP_FLAVOR_ING, items);
  }

  // Actual Production Records
  public getActualRecords(): ActualProductionRecord[] {
    eventBus.recordDbAction('read');
    return loadItem<ActualProductionRecord[]>(STORAGE_KEYS.ACTUAL_RECORDS, SAMPLE_ACTUAL_RECORDS);
  }

  public addActualRecord(record: Omit<ActualProductionRecord, 'id'>): ActualProductionRecord {
    const records = this.getActualRecords();
    const newRecord: ActualProductionRecord = {
      ...record,
      id: 'act-' + Date.now(),
    };
    records.unshift(newRecord);
    saveItem(STORAGE_KEYS.ACTUAL_RECORDS, records);
    this.addAuditLog({
      actor: 'Line Operator',
      section: 'Production History',
      fieldChanged: `Actual Data Logged [${newRecord.skuCode} on ${newRecord.lineId}]`,
      oldValue: `Planned ${newRecord.plannedTargetMio} Mio`,
      newValue: `Actual ${newRecord.actualProducedMio} Mio (Variance: ${newRecord.varianceTobaccoPercent}%)`,
      reason: newRecord.notes || 'End-of-shift actual reporting',
    });
    return newRecord;
  }

  // Batch Schedules (Task 3)
  public getBatchSchedules(): BatchScheduleItem[] {
    const saved = loadItem<BatchScheduleItem[]>(STORAGE_KEYS.BATCH_SCHEDULE, []);
    if (saved.length > 0) return saved;

    // Generate initial batches if empty
    const batches: BatchScheduleItem[] = [
      {
        batchNumber: 1,
        batchCode: 'BATCH-2026-0921-A',
        scheduledDate: '2026-09-21',
        shift: 'Morning (06:00 - 14:00)',
        targetKg: 10000,
        actualKg: 9980,
        siloId: 'SILO-01',
        status: 'Completed',
        variancePercent: -0.2,
      },
      {
        batchNumber: 2,
        batchCode: 'BATCH-2026-0921-B',
        scheduledDate: '2026-09-21',
        shift: 'Evening (14:00 - 22:00)',
        targetKg: 10000,
        actualKg: 10040,
        siloId: 'SILO-02',
        status: 'In Progress',
        variancePercent: 0.4,
      },
      {
        batchNumber: 3,
        batchCode: 'BATCH-2026-0922-A',
        scheduledDate: '2026-09-22',
        shift: 'Morning (06:00 - 14:00)',
        targetKg: 10000,
        siloId: 'SILO-03',
        status: 'Scheduled',
      },
      {
        batchNumber: 4,
        batchCode: 'BATCH-2026-0922-B',
        scheduledDate: '2026-09-22',
        shift: 'Evening (14:00 - 22:00)',
        targetKg: 10000,
        siloId: 'SILO-01',
        status: 'Scheduled',
      },
    ];
    saveItem(STORAGE_KEYS.BATCH_SCHEDULE, batches);
    return batches;
  }

  public saveBatchSchedules(batches: BatchScheduleItem[]): void {
    saveItem(STORAGE_KEYS.BATCH_SCHEDULE, batches);
  }

  // Audit Logs
  public getAuditLogs(): AuditLogEntry[] {
    eventBus.recordDbAction('read');
    return loadItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    logs.unshift(newEntry);
    if (logs.length > 300) logs.pop();
    saveItem(STORAGE_KEYS.AUDIT_LOGS, logs);

    eventBus.addEventLog({
      source: 'Audit Log Engine',
      eventType: 'USER_ACTION',
      message: `${entry.actor} modified ${entry.section}: ${entry.fieldChanged}`,
      status: 'info',
    });

    return newEntry;
  }

  // Connected Agents (Task 9)
  public getConnectedAgents(): ConnectedAgent[] {
    eventBus.recordDbAction('read');
    return loadItem<ConnectedAgent[]>(STORAGE_KEYS.CONNECTED_AGENTS, INITIAL_CONNECTED_AGENTS);
  }

  public saveConnectedAgents(agents: ConnectedAgent[]): void {
    saveItem(STORAGE_KEYS.CONNECTED_AGENTS, agents);
  }

  // A2A Messages
  public getA2AMessages(): A2ARequestMessage[] {
    return loadItem<A2ARequestMessage[]>(STORAGE_KEYS.A2A_MESSAGES, [
      {
        id: 'msg-1',
        timestamp: '2026-09-21 11:20:00',
        direction: 'INCOMING',
        agentName: 'SAP ERP Production Agent',
        method: 'calculateSecondaryPlan',
        payload: { targetMio: 15, sku: 'SKU-001' },
        responseStatus: 'SUCCESS',
        executionTimeMs: 14,
      },
      {
        id: 'msg-2',
        timestamp: '2026-09-21 11:45:10',
        direction: 'OUTGOING',
        agentName: 'Tobacco Leaf Procurement Agent',
        method: 'getBlendBOM',
        payload: { batchSize: 10000, totalBatches: 4 },
        responseStatus: 'SUCCESS',
        executionTimeMs: 22,
      },
      {
        id: 'msg-3',
        timestamp: '2026-09-21 12:10:05',
        direction: 'INCOMING',
        agentName: 'Finished Goods Logistics Agent',
        method: 'calculatePrimaryBatches',
        payload: { totalDemandKg: 33750 },
        responseStatus: 'SUCCESS',
        executionTimeMs: 18,
      },
    ]);
  }

  public addA2AMessage(msg: Omit<A2ARequestMessage, 'id' | 'timestamp'>): A2ARequestMessage {
    const list = this.getA2AMessages();
    const newMsg: A2ARequestMessage = {
      ...msg,
      id: 'a2a-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
    };
    list.unshift(newMsg);
    if (list.length > 100) list.pop();
    saveItem(STORAGE_KEYS.A2A_MESSAGES, list);

    eventBus.addEventLog({
      source: `A2A: ${msg.agentName}`,
      eventType: 'A2A_MESSAGE',
      message: `[${msg.direction}] Method: ${msg.method} (${msg.executionTimeMs}ms)`,
      status: msg.responseStatus === 'SUCCESS' ? 'success' : 'error',
      payload: msg.payload,
    });

    return newMsg;
  }
  // Sku BOM Factors aliases
  public getBOMFactors(): SkuBOMFactors {
    return this.getSkuBOMFactors();
  }

  public saveBOMFactors(factors: SkuBOMFactors, actor: string = 'User'): void {
    this.saveSkuBOMFactors(factors, actor);
  }

  public resetToDefaults(actor: string = 'User'): void {
    saveItem(STORAGE_KEYS.CONSTANTS, DEFAULT_FACTORY_CONSTANTS);
    saveItem(STORAGE_KEYS.LINES, DEFAULT_PRODUCTION_LINES);
    saveItem(STORAGE_KEYS.SECONDARY_PLAN, INITIAL_SECONDARY_PLAN);
    saveItem(STORAGE_KEYS.BOM_FACTORS, DEFAULT_SKU_BOM_FACTORS);
    saveItem(STORAGE_KEYS.BLEND, DEFAULT_BLEND_COMPONENTS);
    saveItem(STORAGE_KEYS.STEM_STAGES, DEFAULT_STEM_STAGES);
    saveItem(STORAGE_KEYS.STEM_YIELD, 90.0);
    saveItem(STORAGE_KEYS.CASING_RATE, 10.0);
    saveItem(STORAGE_KEYS.TOP_FLAVOR_RATE, 1.2);
    saveItem(STORAGE_KEYS.CASING_ING, DEFAULT_CASING_INGREDIENTS);
    saveItem(STORAGE_KEYS.TOP_FLAVOR_ING, DEFAULT_TOP_FLAVOR_INGREDIENTS);
    saveItem(STORAGE_KEYS.ACTUAL_RECORDS, SAMPLE_ACTUAL_RECORDS);
    saveItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    saveItem(STORAGE_KEYS.CONNECTED_AGENTS, INITIAL_CONNECTED_AGENTS);

    this.addAuditLog({
      actor,
      section: 'System Factory State',
      fieldChanged: 'Reset All Data to Realistic Factory Baselines',
      oldValue: 'Previous State',
      newValue: 'Realistic Factory Production Baselines V2',
      reason: 'User requested resetting to industrial standard specifications',
    });

    eventBus.addEventLog({
      source: 'Storage Engine',
      eventType: 'STATE_MUTATION',
      message: 'All production datasets restored to realistic industrial factory baselines.',
      status: 'success',
    });

    this.notifyChange();
  }

  private changeListeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }
}

export const storageService = new StorageService();
