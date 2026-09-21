import React, { useState } from 'react';
import {
  Network,
  Play,
  Copy,
  Check,
  Code2,
  Cpu,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';
import { eventBus } from '../services/eventBus';

interface Task9A2AHubProps {
  language: Language;
}

export const Task9A2AHub: React.FC<Task9A2AHubProps> = ({ language }) => {
  const isAr = language === 'ar';

  const [method, setMethod] = useState<string>('plan.generateBOM');
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify(
      {
        jsonrpc: '2.0',
        method: 'plan.generateBOM',
        params: {
          planItems: [
            { skuCode: 'SKU-001', skuName: 'Royal Gold King Size', packType: 'Hard', targetMio: 15.0 },
            { skuCode: 'SKU-002', skuName: 'Silver Touch Lights', packType: 'Hard', targetMio: 12.5 },
            { skuCode: 'SKU-003', skuName: 'Classic Red Filter', packType: 'Soft', targetMio: 10.0 },
          ],
          batchSizeKg: 10000,
          stickWeightG: 0.75,
        },
        id: 'req-' + Date.now().toString().slice(-4),
      },
      null,
      2
    )
  );

  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const handleRunRpc = async () => {
    setIsLoading(true);
    setResponseOutput(null);
    const start = performance.now();

    try {
      let parsed;
      try {
        parsed = JSON.parse(requestPayload);
      } catch (err) {
        throw new Error('Invalid JSON syntax in request payload');
      }

      eventBus.setNodeStatus('a2a', 'Running', 1500);
      eventBus.addEventLog({
        source: 'Task 9: A2A Endpoint',
        eventType: 'A2A_MESSAGE',
        message: `Inbound JSON-RPC 2.0 call received for method: '${parsed.method}'. Dispatched to planner backend.`,
        status: 'info',
        payload: parsed,
      });

      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setResponseOutput(JSON.stringify(data, null, 2));

      eventBus.addEventLog({
        source: 'Task 9: A2A Endpoint',
        eventType: 'A2A_MESSAGE',
        message: `JSON-RPC response rendered with status ${res.status} in ${elapsed}ms. Returned ${Object.keys(data.result?.boms || {}).length || 0} BOM departments.`,
        status: data.error ? 'error' : 'success',
        payload: data,
      });
    } catch (error: any) {
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      const errObj = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message || 'Internal error',
        },
        id: null,
      };
      setResponseOutput(JSON.stringify(errObj, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (presetType: 'bom' | 'secondary' | 'health') => {
    if (presetType === 'bom') {
      setMethod('plan.generateBOM');
      setRequestPayload(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            method: 'plan.generateBOM',
            params: {
              planItems: [
                { skuCode: 'SKU-001', skuName: 'Royal Gold King Size', packType: 'Hard', targetMio: 15.0 },
                { skuCode: 'SKU-002', skuName: 'Silver Touch Lights', packType: 'Hard', targetMio: 12.5 },
              ],
              batchSizeKg: 10000,
              stickWeightG: 0.75,
            },
            id: 'req-' + Date.now().toString().slice(-4),
          },
          null,
          2
        )
      );
    } else if (presetType === 'secondary') {
      setMethod('plan.getSecondary');
      setRequestPayload(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            method: 'plan.getSecondary',
            params: {
              targetMio: 20.0,
              packType: 'Hard',
              stickWeightG: 0.75,
            },
            id: 'req-' + Date.now().toString().slice(-4),
          },
          null,
          2
        )
      );
    } else {
      setMethod('rpc.discover');
      setRequestPayload(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            method: 'rpc.discover',
            params: {},
            id: 'req-' + Date.now().toString().slice(-4),
          },
          null,
          2
        )
      );
    }
  };

  const handleCopy = () => {
    if (responseOutput) {
      navigator.clipboard.writeText(responseOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'المهمة 9: بروتوكول التواصل بين الوكلاء (Open A2A Hub & JSON-RPC 2.0)' : 'Task 9: Agent-to-Agent (A2A) JSON-RPC 2.0 Hub'}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Open A2A Spec
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'نقطة نهاية معيارية تستقبل طلبات الخطط آلياً وتُرجع كامل BOM المجمع لأقسام المصنع بصيغة JSON-RPC 2.0'
              : 'Machine-readable protocol enabling ERPs, MES systems, or sub-agents to trigger end-to-end BOM synthesis'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono">POST /api/a2a</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
            Active
          </span>
        </div>
      </div>

      {/* Preset Action Strip */}
      <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-800/40 p-3 rounded-lg border border-slate-700">
        <span className="text-slate-400 font-medium">{isAr ? 'نماذج جاهزة للاختبار:' : 'Payload Presets:'}</span>
        <button
          onClick={() => loadPreset('bom')}
          className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-amber-300 font-mono transition-colors"
        >
          plan.generateBOM (Full Factory)
        </button>
        <button
          onClick={() => loadPreset('secondary')}
          className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-cyan-300 font-mono transition-colors"
        >
          plan.getSecondary (Unit SKU)
        </button>
        <button
          onClick={() => loadPreset('health')}
          className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-emerald-300 font-mono transition-colors"
        >
          rpc.discover (Capabilities)
        </button>
      </div>

      {/* Dual Interactive Console: Request & Response */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 flex flex-col justify-between shadow-lg overflow-hidden">
          <div className="p-3 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">
                {isAr ? 'طلب العميل (JSON-RPC 2.0 Request)' : 'Client Request Payload'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Content-Type: application/json</span>
          </div>

          <div className="p-3 flex-1 flex flex-col">
            <textarea
              rows={14}
              value={requestPayload}
              onChange={(e) => setRequestPayload(e.target.value)}
              className="w-full h-full bg-slate-950 font-mono text-xs text-amber-300 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500/70 resize-none leading-relaxed"
            />
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {isAr ? 'البروتوكول: JSON-RPC 2.0' : 'Spec: JSON-RPC 2.0 (Open A2A)'}
            </span>
            <button
              onClick={handleRunRpc}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جاري التنفيذ...' : 'Executing...'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAr ? 'اختبار الـ API (Execute)' : 'Test API Endpoint'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-slate-800/90 rounded-xl border border-slate-700 flex flex-col justify-between shadow-lg overflow-hidden">
          <div className="p-3 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                {isAr ? 'استجابة الوكيل (Agent Server Response)' : 'Agent Server Response'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {latencyMs !== null && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {latencyMs}ms latency
                </span>
              )}
              {responseOutput && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-3 flex-1 flex flex-col">
            <pre className="w-full h-full bg-slate-950 font-mono text-xs text-emerald-400 p-3 rounded-lg border border-slate-800 overflow-auto leading-relaxed max-h-80">
              {responseOutput || (
                <span className="text-slate-600">
                  {isAr
                    ? '// انقر "اختبار الـ API" لإرسال الطلب ومشاهدة الاستجابة المعيارية...'
                    : '// Click "Test API Endpoint" to dispatch payload and inspect structured response...'}
                </span>
              )}
            </pre>
          </div>

          <div className="p-3 bg-slate-900/60 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{isAr ? 'التوثيق: schema مدمجة تدعم التجميع الآلي' : 'Standardized cross-agent RPC schema'}</span>
            <span className="text-cyan-400 font-mono">Status: 200 OK</span>
          </div>
        </div>
      </div>

      {/* Schema Contract Documentation Card */}
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'توثيق مواصفات بروتوكول A2A (Protocol Schema Contract)' : 'A2A Protocol Schema Specification'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-mono font-bold text-amber-400">1. plan.generateBOM</div>
            <p className="text-slate-400 text-[11px]">
              {isAr
                ? 'يستقبل قائمة المنتجات ومقدار كل منتج، ويحسب كامل BOM لكل المواد والتبغ والسيقان والمحاليل دفعة واحدة.'
                : 'Aggregates secondary demands into primary batches, blend breakdown, stem mass-balance, and liquid solution BOM.'}
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-mono font-bold text-cyan-400">2. plan.getSecondary</div>
            <p className="text-slate-400 text-[11px]">
              {isAr
                ? 'يحسب الكراتين والعلب والسجائر وساعات التشغيل وأيام الإنتاج لمنتج مفرد بناءً على السرعة والكفاءة.'
                : 'Calculates carton, pack, stick conversions, run hours and calendar days for single SKU targets.'}
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-mono font-bold text-purple-400">3. rpc.discover</div>
            <p className="text-slate-400 text-[11px]">
              {isAr
                ? 'اكتشاف قدرات الوكيل والخطوط المتاحة والثوابت الفيزيائية المدعومة آلياً.'
                : 'Service discovery querying agent capabilities, factory limits, and supported blend grade codes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
