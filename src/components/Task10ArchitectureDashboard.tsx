import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Zap,
  Layers,
  Filter,
  Trash2,
  Clock,
  Radio,
  Server,
  Network,
  ArrowDown,
  ArrowRight,
  GitBranch,
  Bot,
  Database,
  Sliders,
  CheckCircle2,
  Share2,
  Send,
  Eye,
  Info,
  Maximize2,
} from 'lucide-react';
import { Language, AgentNode, AgentEventLog, AgentMetrics } from '../types';
import { eventBus } from '../services/eventBus';

interface Task10ArchitectureDashboardProps {
  language: Language;
}

interface GraphConnection {
  from: string;
  to: string;
  labelAr: string;
  labelEn: string;
  type: 'data' | 'control' | 'feedback' | 'a2a';
}

export const Task10ArchitectureDashboard: React.FC<Task10ArchitectureDashboardProps> = ({
  language,
}) => {
  const isAr = language === 'ar';

  const [nodes, setNodes] = useState<AgentNode[]>(eventBus.getNodes());
  const [logs, setLogs] = useState<AgentEventLog[]>(eventBus.getEventLogs());
  const [metrics, setMetrics] = useState<AgentMetrics>(eventBus.getMetrics());
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('planner-core');
  const [viewMode, setViewMode] = useState<'graph' | 'pipeline' | 'table'>('graph');
  const [activePulse, setActivePulse] = useState<boolean>(true);

  useEffect(() => {
    const unsubNodes = eventBus.subscribeNodes(setNodes);
    const unsubLogs = eventBus.subscribeLogs(setLogs);
    const unsubMetrics = eventBus.subscribeMetrics(setMetrics);

    return () => {
      unsubNodes();
      unsubLogs();
      unsubMetrics();
    };
  }, []);

  const handleToggleNodePause = (nodeId: string) => {
    eventBus.toggleNodePause(nodeId);
  };

  const handleClearLogs = () => {
    eventBus.clearLogs();
  };

  const handleTriggerTestPulse = (nodeId: string) => {
    eventBus.setNodeStatus(nodeId, 'Running', 1800);
    eventBus.addEventLog({
      source: `Node: ${nodeId}`,
      eventType: 'TOOL_EXECUTION',
      message: `Manual communication pulse dispatched through node '${nodeId}'. Channel verified.`,
      status: 'success',
    });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    return l.eventType === logFilter;
  });

  // Architectural Graph Node Specifications for Canvas Layout
  const canvasNodes = [
    {
      id: 'trigger-root',
      nameAr: 'نقطة البدء: طلب الخطة أو نظام ERP',
      nameEn: 'Trigger: ERP / Production Schedule',
      x: 350,
      y: 40,
      width: 220,
      height: 52,
      category: 'root',
      protocol: 'HTTPS / Web UI / A2A RPC',
    },
    {
      id: 'planner-core',
      nameAr: 'منسق الوكيل الرئيسي (Master Orchestrator)',
      nameEn: 'Master Agent Orchestrator (Core Hub)',
      x: 350,
      y: 140,
      width: 240,
      height: 60,
      category: 'hub',
      protocol: 'Reactive EventBus & Shared State',
    },
    {
      id: 'task-1',
      nameAr: 'المهمة 1: خطة الثانوي (Secondary)',
      nameEn: 'Task 1: Secondary Plan Engine',
      x: 120,
      y: 250,
      width: 200,
      height: 56,
      category: 'task',
      protocol: 'Sticks & Tobacco Demand Equations',
    },
    {
      id: 'task-2',
      nameAr: 'المهمة 2: BOM المواد (14 Items)',
      nameEn: 'Task 2: SKU Packaging BOM Engine',
      x: 370,
      y: 250,
      width: 200,
      height: 56,
      category: 'task',
      protocol: 'Packaging BOM Factors per Line',
    },
    {
      id: 'task-3',
      nameAr: 'المهمة 3: خطة الأولي والصوامع',
      nameEn: 'Task 3: Primary Batching Engine',
      x: 620,
      y: 250,
      width: 200,
      height: 56,
      category: 'task',
      protocol: '10,000kg Sizing & Silo Buffering',
    },
    {
      id: 'task-4',
      nameAr: 'المهمة 4: بوم الخلطة (13 درجات)',
      nameEn: 'Task 4: Blend 13-Grade Balancer',
      x: 60,
      y: 360,
      width: 190,
      height: 56,
      category: 'sub',
      protocol: 'Strict 100% Mass Allocation',
    },
    {
      id: 'task-5',
      nameAr: 'المهمة 5: معالجة السيقان (5 مراحل)',
      nameEn: 'Task 5: Stem Mass-Balance Engine',
      x: 270,
      y: 360,
      width: 190,
      height: 56,
      category: 'sub',
      protocol: 'Sequential Mass Factor (-5% to -2%)',
    },
    {
      id: 'task-6',
      nameAr: 'المهمة 6: بوم المحاليل (الكيسنج والنكهة)',
      nameEn: 'Task 6: Solution Chemistry Engine',
      x: 480,
      y: 360,
      width: 190,
      height: 56,
      category: 'sub',
      protocol: '10% Casing & 1.2% Flavor Ratio',
    },
    {
      id: 'engine',
      nameAr: 'المهمة 8: محرك التعلّم التكيفي',
      nameEn: 'Task 8: Machine Adaptive Learning',
      x: 690,
      y: 360,
      width: 190,
      height: 56,
      category: 'learning',
      protocol: 'Statistical Run Variance Calibration',
    },
    {
      id: 'database',
      nameAr: 'المهمة 7: سجل الإنتاج والتدقيق',
      nameEn: 'Task 7: State & Audit Ledger',
      x: 220,
      y: 470,
      width: 230,
      height: 56,
      category: 'state',
      protocol: 'Immutable Storage & Change Audit',
    },
    {
      id: 'a2a',
      nameAr: 'المهمة 9: بوابة بروتوكول A2A',
      nameEn: 'Task 9: Open A2A JSON-RPC 2.0 Hub',
      x: 490,
      y: 470,
      width: 230,
      height: 56,
      category: 'gateway',
      protocol: 'JSON-RPC 2.0 / Port 3000 Endpoint',
    },
  ];

  // Communication channels / Edges connecting the nodes
  const connections: GraphConnection[] = [
    { from: 'trigger-root', to: 'planner-core', labelAr: 'أهداف الإنتاج', labelEn: 'Production Targets', type: 'control' },
    { from: 'planner-core', to: 'task-1', labelAr: 'أوامر تصنيع الأصناف', labelEn: 'SKU Order Parameters', type: 'control' },
    { from: 'task-1', to: 'task-2', labelAr: 'الكراتين والعبوات', labelEn: 'Carton Volumes', type: 'data' },
    { from: 'task-1', to: 'task-3', labelAr: 'التبغ المطلوب (kg)', labelEn: 'Cut Tobacco Demand', type: 'data' },
    { from: 'task-3', to: 'task-4', labelAr: 'دفعات الخلطة (10t)', labelEn: 'Batch Allocation', type: 'data' },
    { from: 'task-3', to: 'task-5', labelAr: 'حصة السيقان الممددة', labelEn: 'Stem Requirements', type: 'data' },
    { from: 'task-3', to: 'task-6', labelAr: 'محاليل النكهة للدفعة', labelEn: 'Casing/Flavor Dosing', type: 'data' },
    { from: 'database', to: 'engine', labelAr: 'سجلات الإنتاج الفعلي', labelEn: 'Actual Run Logs', type: 'feedback' },
    { from: 'engine', to: 'planner-core', labelAr: 'معايرة الكفاءة والأوزان', labelEn: 'Tuned Baselines', type: 'feedback' },
    { from: 'planner-core', to: 'a2a', labelAr: 'استعلامات الوكلاء الخارجية', labelEn: 'Inter-Agent RPC Calls', type: 'a2a' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr
                ? 'المهمة 10: المخطط الشبكي والتواصلي للوكيل (Agent Node Graph & Communication)'
                : 'Task 10: Agent Node Graph & Inter-Node Communication'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Live Mesh Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'نموذج التوصيل الشبكي (DAG & Hub-and-Spoke): كيف تتدفق الأوامر والبيانات بين العقدة المركزية، المهام الفرعية، البوابات، وحلقات التغذية الراجعة'
              : 'Interactive DAG & Hub-and-Spoke topology: Command dispatch, message passing, A2A gateways, and adaptive feedback loops'}
          </p>
        </div>

        {/* View mode buttons & quick metrics */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900/90 rounded-lg p-1 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                viewMode === 'graph' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'مخطط العقد (Graph)' : 'Node Graph'}
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'قائمة العقد' : 'Nodes List'}
            </button>
          </div>

          <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono">
            <span className="text-slate-400">{isAr ? 'الاستجابة:' : 'Latency:'} </span>
            <span className="text-emerald-400 font-bold">{metrics.latencyMs} ms</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas & Inspector Split Layout */}
      {viewMode === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Interactive SVG Node-Graph Canvas (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-hidden shadow-2xl">
            {/* Canvas Header Legend */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  {isAr ? 'المنسق الرئيسي (Hub)' : 'Hub Core'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  {isAr ? 'تدفق البيانات (Data)' : 'Data Stream'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                  {isAr ? 'تغذية راجعة (Feedback)' : 'Feedback Loop'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  {isAr ? 'بوابة A2A' : 'A2A Gateway'}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                {isAr ? 'اضغط على أي عقدة لمعاينة عقد الاتصال' : 'Click any node to inspect contract'}
              </div>
            </div>

            {/* SVG Visual Canvas Area */}
            <div className="relative w-full overflow-x-auto min-h-[550px] bg-slate-950/90 rounded-lg border border-slate-900 flex items-center justify-center">
              <svg
                viewBox="0 0 920 560"
                className="w-full max-w-[920px] h-auto select-none"
                style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
              >
                <defs>
                  {/* Glowing Arrow Markers */}
                  <marker
                    id="arrow-data"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                  <marker
                    id="arrow-control"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="arrow-feedback"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
                  </marker>
                  <marker
                    id="arrow-a2a"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
                  </marker>
                </defs>

                {/* Curved Connection Lines (Edges) */}
                {connections.map((conn, idx) => {
                  const fromNode = canvasNodes.find((n) => n.id === conn.from);
                  const toNode = canvasNodes.find((n) => n.id === conn.to);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + fromNode.width / 2;
                  const y1 = fromNode.y + fromNode.height;
                  const x2 = toNode.x + toNode.width / 2;
                  const y2 = toNode.y;

                  // Curved cubic bezier
                  const dy = Math.max(30, (y2 - y1) / 2);
                  const pathD = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                  const strokeColor =
                    conn.type === 'control'
                      ? '#f59e0b'
                      : conn.type === 'feedback'
                      ? '#c084fc'
                      : conn.type === 'a2a'
                      ? '#22d3ee'
                      : '#38bdf8';

                  const markerId = `url(#arrow-${conn.type})`;

                  return (
                    <g key={`edge-${idx}`}>
                      {/* Outer shadow glow */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3"
                        strokeOpacity="0.15"
                      />
                      {/* Main connecting wire */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                        markerEnd={markerId}
                        strokeDasharray={conn.type === 'feedback' ? '4 3' : 'none'}
                      />

                      {/* Animated traveling signal pulse particle */}
                      {activePulse && (
                        <circle r="3.5" fill={strokeColor}>
                          <animateMotion
                            path={pathD}
                            dur={`${2.2 + (idx % 3) * 0.4}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Render Graph Nodes */}
                {canvasNodes.map((n) => {
                  const isSelected = selectedNodeId === n.id;
                  const liveNode = nodes.find((live) => live.id === n.id);
                  const isRunning = liveNode?.status === 'Running';
                  const isPaused = liveNode?.isPaused;

                  const fillBg = isSelected
                    ? '#1e293b'
                    : n.category === 'hub'
                    ? '#1e1b4b'
                    : n.category === 'root'
                    ? '#0f172a'
                    : n.category === 'learning'
                    ? '#2e1065'
                    : n.category === 'gateway'
                    ? '#083344'
                    : '#0f172a';

                  const strokeBorder = isSelected
                    ? '#f59e0b'
                    : isRunning
                    ? '#22c55e'
                    : isPaused
                    ? '#64748b'
                    : n.category === 'hub'
                    ? '#818cf8'
                    : '#334155';

                  return (
                    <g
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      className="cursor-pointer transition-transform duration-200"
                    >
                      {/* Node container card */}
                      <rect
                        x={n.x}
                        y={n.y}
                        width={n.width}
                        height={n.height}
                        rx="10"
                        fill={fillBg}
                        stroke={strokeBorder}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        style={{
                          filter: isSelected ? 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' : 'none',
                        }}
                      />

                      {/* Status indicator pip */}
                      <circle
                        cx={n.x + 14}
                        cy={n.y + n.height / 2}
                        r="4"
                        fill={isPaused ? '#94a3b8' : isRunning ? '#eab308' : '#10b981'}
                      />

                      {/* Node Label Text */}
                      <text
                        x={n.x + 28}
                        y={n.y + 22}
                        fill="#ffffff"
                        fontSize="11.5"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {isAr ? n.nameAr : n.nameEn}
                      </text>

                      {/* Subtitle / Protocol */}
                      <text
                        x={n.x + 28}
                        y={n.y + 40}
                        fill="#94a3b8"
                        fontSize="9.5"
                        fontFamily="monospace"
                      >
                        {n.protocol}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Node Inspector & Communication Details Panel (4 cols on desktop - like the right drawer in the image) */}
          <div className="lg:col-span-4 bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isAr ? 'فاحص العقدة وقنوات الاتصال' : 'Node Inspector & Contract'}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {selectedNode.id}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedNode.isPaused
                      ? 'bg-slate-700 text-slate-300'
                      : selectedNode.status === 'Running'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {selectedNode.isPaused ? 'PAUSED' : selectedNode.status}
                </span>
              </div>

              {/* Node Metadata & Description */}
              <div className="mt-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-amber-400">
                    {isAr ? selectedNode.nameAr : selectedNode.nameEn}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isAr ? selectedNode.descriptionAr : selectedNode.descriptionEn}
                  </p>
                </div>

                {/* How this node communicates */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    {isAr ? 'آلية التواصل والتفاعل' : 'Communication Protocol'}
                  </span>

                  <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'النمط:' : 'Pattern:'}</span>
                      <span className="text-amber-300 font-semibold">
                        {selectedNode.id === 'planner-core'
                          ? 'Hub & Spoke Dispatcher'
                          : selectedNode.id === 'a2a'
                          ? 'Open JSON-RPC 2.0 Endpoint'
                          : selectedNode.id === 'engine'
                          ? 'Continuous Closed-Loop Feedback'
                          : 'Asynchronous Event-Driven RPC'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'قناة النقل:' : 'Transport:'}</span>
                      <span className="text-cyan-300">In-Memory EventBus + HTTP /api/a2a</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'التبادل:' : 'Data Contract:'}</span>
                      <span className="text-emerald-300">JSON Schema Strictly Typed</span>
                    </div>
                  </div>
                </div>

                {/* Inbound & Outbound Data Samples */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    {isAr ? 'عقد الحمولة (Payload Contract)' : 'Active Payload Schema'}
                  </span>

                  <div className="font-mono text-[10.5px] bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto max-h-36">
                    {selectedNode.id === 'task-1' && (
                      <pre>{`{\n  "targetMio": 10,\n  "packType": "Hard",\n  "out": {\n    "cartons": 1000,\n    "tobaccoKg": 7500\n  }\n}`}</pre>
                    )}
                    {selectedNode.id === 'task-3' && (
                      <pre>{`{\n  "demandKg": 33750,\n  "batchSize": 10000,\n  "out": {\n    "batches": 4,\n    "surplusKg": 6250\n  }\n}`}</pre>
                    )}
                    {selectedNode.id === 'task-4' && (
                      <pre>{`{\n  "grades": ["BU","FU","OR",...],\n  "balance": "100.0%",\n  "status": "VALIDATED"\n}`}</pre>
                    )}
                    {selectedNode.id === 'engine' && (
                      <pre>{`{\n  "minSamples": 5,\n  "calibrate": ["Line Efficiency", "Stick Weight"],\n  "action": "AUTO_PROPOSE"\n}`}</pre>
                    )}
                    {selectedNode.id === 'a2a' && (
                      <pre>{`{\n  "jsonrpc": "2.0",\n  "method": "calculateSecondaryPlan",\n  "port": 3000\n}`}</pre>
                    )}
                    {selectedNode.id !== 'task-1' &&
                      selectedNode.id !== 'task-3' &&
                      selectedNode.id !== 'task-4' &&
                      selectedNode.id !== 'engine' &&
                      selectedNode.id !== 'a2a' && (
                        <pre>{`{\n  "nodeId": "${selectedNode.id}",\n  "state": "CONNECTED",\n  "sync": "BI-DIRECTIONAL"\n}`}</pre>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for this Node */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => handleToggleNodePause(selectedNode.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  selectedNode.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {selectedNode.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isAr ? 'استئناف العقدة' : 'Resume Node'}</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>{isAr ? 'إيقاف مؤقت' : 'Pause Node'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleTriggerTestPulse(selectedNode.id)}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAr ? 'إرسال نبضة تجريبية' : 'Test Pulse'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Table View */}
      {viewMode === 'table' && (
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 p-5 shadow-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {nodes.map((node) => {
              const isPaused = node.isPaused;
              const isRunning = node.status === 'Running';
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`cursor-pointer bg-slate-900 rounded-xl p-3.5 border transition-all ${
                    selectedNodeId === node.id ? 'border-amber-400 ring-2 ring-amber-500/20' : 'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {node.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPaused
                          ? 'bg-slate-700 text-slate-300'
                          : isRunning
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2">
                    {isAr ? node.nameAr : node.nameEn}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {isAr ? node.descriptionAr : node.descriptionEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-Time Agent Event Log Stream */}
      <div className="bg-slate-800/90 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col justify-between">
        <div className="p-3 bg-slate-900/90 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {isAr ? 'سجل تواصل وأحداث الوكيل الحي (Live Inter-Node Event Stream)' : 'Real-Time Agent Event Log Stream'}
            </h3>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              {isAr ? 'نوع الحدث:' : 'Event Type:'}
            </span>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
            >
              <option value="ALL">{isAr ? 'جميع الأحداث (ALL)' : 'ALL'}</option>
              <option value="TOOL_EXECUTION">TOOL_EXECUTION</option>
              <option value="STATE_MUTATION">STATE_MUTATION</option>
              <option value="A2A_MESSAGE">A2A_MESSAGE</option>
              <option value="ADAPTIVE_LEARNING">ADAPTIVE_LEARNING</option>
              <option value="DB_SYNC">DB_SYNC</option>
              <option value="USER_ACTION">USER_ACTION</option>
            </select>

            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'مسح' : 'Clear'}</span>
            </button>
          </div>
        </div>

        {/* Log table */}
        <div className="overflow-x-auto max-h-80 overflow-y-auto bg-slate-950 p-2 font-mono text-xs">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800 text-[11px] uppercase">
                <th className="p-2 w-28">{isAr ? 'الوقت' : 'Time'}</th>
                <th className="p-2 w-36">{isAr ? 'المصدر' : 'Source'}</th>
                <th className="p-2 w-32">{isAr ? 'النوع' : 'Event Type'}</th>
                <th className="p-2">{isAr ? 'الرسالة والحمولة' : 'Message & Context'}</th>
                <th className="p-2 w-20 text-center">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredLogs.map((log) => {
                const isSuccess = log.status === 'success';
                const isWarning = log.status === 'warning';
                const isError = log.status === 'error';

                return (
                  <tr key={log.id} className="hover:bg-slate-900/60 transition-colors text-xs">
                    <td className="p-2 text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-2 font-bold text-amber-400 text-[11px]">{log.source}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-cyan-300 border border-slate-800">
                        {log.eventType}
                      </span>
                    </td>
                    <td className="p-2 text-slate-300">{log.message}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuccess
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : isWarning
                            ? 'text-amber-400 bg-amber-500/10'
                            : isError
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
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
