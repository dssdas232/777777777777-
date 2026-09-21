import { AgentNode, AgentEventLog, AgentMetrics, NodeStatus } from '../types';

type Listener<T> = (data: T) => void;

class EventBusService {
  private eventLogs: AgentEventLog[] = [];

  private nodes: AgentNode[] = [
    {
      id: 'planner-core',
      nameAr: 'المنسق الرئيسي للوكيل (Planner Core)',
      nameEn: 'Master Planner Core Orchestrator',
      type: 'agent-core',
      status: 'Idle',
      descriptionAr: 'تنسيق تدفق الحسابات بين الثانوي والأولي وإدارة التكامل',
      descriptionEn: 'Orchestrates data flow between primary, secondary, and BOMs',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-1',
      nameAr: 'المهمة 1: خطة الثانوي (Secondary)',
      nameEn: 'Task 1: Secondary Plan & Lines',
      type: 'production',
      status: 'Idle',
      descriptionAr: 'حساب الكراتين والعلب والسجائر وساعات وأيام الإنتاج',
      descriptionEn: 'Carton, pack, stick conversions and line capacity planning',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-2',
      nameAr: 'المهمة 2: فاتورة المواد (SKU BOM)',
      nameEn: 'Task 2: SKU & Line BOM Factors',
      type: 'bom-engine',
      status: 'Idle',
      descriptionAr: 'حساب استهلاك الـ 14 مادة أولية ومواد تغليف لكل SKU',
      descriptionEn: '14 direct packaging and raw materials calculation engine',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-3',
      nameAr: 'المهمة 3: الإنتاج الأولي (Primary Plan)',
      nameEn: 'Task 3: Primary Batching & Silos',
      type: 'production',
      status: 'Idle',
      descriptionAr: 'تجميع احتياج التبغ وحساب عدد الدفعات وفائض الصوامع',
      descriptionEn: 'Primary blend batch sizing and intermediate silo buffering',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-4',
      nameAr: 'المهمة 4: بوم الخلطة (Blend BOM)',
      nameEn: 'Task 4: Tobacco Blend (13 Grades)',
      type: 'formulation',
      status: 'Idle',
      descriptionAr: 'فحص الاتزان 100% لدرجات BU, FU, OR, CL, RE, IS, SL...',
      descriptionEn: 'Strict 100% balance validation for the 13 blend leaf grades',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-5',
      nameAr: 'المهمة 5: معالجة السيقان (Stem BOM)',
      nameEn: 'Task 5: Stem BOM & Expansion Line',
      type: 'mass-balance',
      status: 'Idle',
      descriptionAr: 'تتبع مراحل خط السيقان: تنظيف، تقطيع، بخار، كيسنج، تمديد',
      descriptionEn: 'Sequential 5-stage mass balance tracking and target yield',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'task-6',
      nameAr: 'المهمة 6: بوم المحاليل (Solution BOM)',
      nameEn: 'Task 6: Solution (Casing & Top-Flavor)',
      type: 'chemistry',
      status: 'Idle',
      descriptionAr: 'تجهيز كميات الكيسنج (10%) والتوب فليفر (1.2%) لكل دفعة',
      descriptionEn: 'Preparation of humectants, sugars, sauces, and volatile aromas',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'engine',
      nameAr: 'المهمة 8: محرك التعلّم التكيفي',
      nameEn: 'Task 8: Machine Adaptive Learning',
      type: 'ml-calibration',
      status: 'Idle',
      descriptionAr: 'معايرة الافتراضات واقتراح التعديلات بعد 5 سجلات فعلية',
      descriptionEn: 'Baseline parameter calibration engine based on historical runs',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'a2a',
      nameAr: 'المهمة 9: بوابة A2A Hub',
      nameEn: 'Task 9: Open A2A JSON-RPC 2.0 Hub',
      type: 'gateway',
      status: 'Idle',
      descriptionAr: 'نقطة نهاية معيارية لتبادل البيانات بين وكلاء الأنظمة',
      descriptionEn: 'Inter-agent RPC protocol endpoint for automated synthesis',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'database',
      nameAr: 'المهمة 7: مزامنة Firestore',
      nameEn: 'Task 7: Firestore Persistent DB',
      type: 'database',
      status: 'Idle',
      descriptionAr: 'قاعدة بيانات سحابية وتاريخ الإنتاج وسجل التدقيق',
      descriptionEn: 'Production run records and immutable audit logs storage',
      lastActive: 'Just now',
      isPaused: false,
    },
    {
      id: 'ai-chat',
      nameAr: 'المهمة 11: مساعد المحادثة الذكي',
      nameEn: 'Task 11: AI Production Assistant',
      type: 'assistant',
      status: 'Idle',
      descriptionAr: 'محرك المحادثة التفاعلي وتفسير الأوامر الطبيعية',
      descriptionEn: 'Interactive natural language query and command executor',
      lastActive: 'Just now',
      isPaused: false,
    },
  ];

  private metrics: AgentMetrics = {
    latencyMs: 14,
    memoryHeapMb: 24.5,
    activeTasks: 1,
    totalProcessed: 182,
  };

  private dbMetrics = {
    reads: 42,
    writes: 18,
    lastSync: new Date().toLocaleTimeString(),
  };

  private eventListeners: Set<Listener<AgentEventLog[]>> = new Set();
  private nodeListeners: Set<Listener<AgentNode[]>> = new Set();
  private metricsListeners: Set<Listener<AgentMetrics>> = new Set();
  private dbMetricsListeners: Set<Listener<typeof this.dbMetrics>> = new Set();

  constructor() {
    // Initial bootstrap logs
    this.addEventLog({
      source: 'System Engine',
      eventType: 'TOOL_EXECUTION',
      message: 'Cigarette Factory Production AI Planner Engine initialized.',
      status: 'info',
    });
    this.addEventLog({
      source: 'Firestore Sync',
      eventType: 'DB_SYNC',
      message: 'Persistent schema active. 6 SKU models & historical records loaded.',
      status: 'success',
    });
  }

  public addEventLog(
    event: Omit<AgentEventLog, 'id' | 'timestamp'> & { timestamp?: string }
  ): AgentEventLog {
    const newLog: AgentEventLog = {
      id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: event.timestamp || new Date().toLocaleTimeString(),
      source: event.source,
      eventType: event.eventType,
      message: event.message,
      status: event.status,
      payload: event.payload,
    };

    this.eventLogs.unshift(newLog);
    if (this.eventLogs.length > 200) {
      this.eventLogs.pop();
    }

    this.metrics.totalProcessed += 1;
    this.notifyLogListeners();
    return newLog;
  }

  public getEventLogs(): AgentEventLog[] {
    return [...this.eventLogs];
  }

  public clearLogs(): void {
    this.eventLogs = [];
    this.notifyLogListeners();
  }

  public subscribeLogs(listener: Listener<AgentEventLog[]>): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyLogListeners() {
    const copy = [...this.eventLogs];
    this.eventListeners.forEach((l) => l(copy));
  }

  public getNodes(): AgentNode[] {
    return [...this.nodes];
  }

  public subscribeNodes(listener: Listener<AgentNode[]>): () => void {
    this.nodeListeners.add(listener);
    return () => this.nodeListeners.delete(listener);
  }

  public toggleNodePause(nodeId: string): void {
    this.nodes = this.nodes.map((n) =>
      n.id === nodeId ? { ...n, isPaused: !n.isPaused } : n
    );
    this.notifyNodeListeners();
    this.addEventLog({
      source: 'Architecture Dashboard',
      eventType: 'USER_ACTION',
      message: `Task node '${nodeId}' state toggled.`,
      status: 'info',
    });
  }

  public setNodeStatus(nodeId: string, status: NodeStatus, durationMs: number = 0) {
    this.nodes = this.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, status, lastActive: new Date().toLocaleTimeString() }
        : n
    );
    this.metrics.activeTasks = this.nodes.filter((n) => n.status === 'Running').length || 1;
    this.notifyNodeListeners();

    if (durationMs > 0 && status !== 'Idle') {
      setTimeout(() => {
        this.nodes = this.nodes.map((n) =>
          n.id === nodeId ? { ...n, status: 'Idle' } : n
        );
        this.metrics.activeTasks = this.nodes.filter((n) => n.status === 'Running').length;
        this.notifyNodeListeners();
      }, durationMs);
    }
  }

  private notifyNodeListeners() {
    const copy = [...this.nodes];
    this.nodeListeners.forEach((l) => l(copy));
  }

  public getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  public subscribeMetrics(listener: Listener<AgentMetrics>): () => void {
    this.metricsListeners.add(listener);
    return () => this.metricsListeners.delete(listener);
  }

  public recordDbAction(type: 'read' | 'write') {
    if (type === 'read') this.dbMetrics.reads += 1;
    if (type === 'write') this.dbMetrics.writes += 1;
    this.dbMetrics.lastSync = new Date().toLocaleTimeString();
    this.setNodeStatus('database', 'Running', 1200);
    this.dbMetricsListeners.forEach((l) => l({ ...this.dbMetrics }));
  }

  public getDbMetrics() {
    return { ...this.dbMetrics };
  }

  public subscribeDbMetrics(listener: Listener<typeof this.dbMetrics>): () => void {
    this.dbMetricsListeners.add(listener);
    return () => this.dbMetricsListeners.delete(listener);
  }
}

export const eventBus = new EventBusService();
