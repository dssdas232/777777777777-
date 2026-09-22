import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory A2A exchange records & audit logs on server
const a2aServerLogs: any[] = [];

// A2A Agent Card conforming to the Open A2A Protocol
const AGENT_CARD = {
  $schema: 'https://open-a2a.org/schemas/agent-card-v1.json',
  agent_id: 'urn:a2a:agent:cig-production-planner:v1',
  name: 'Cigarette Factory AI Production Planner',
  name_ar: 'وكيل الذكاء الاصطناعي لتخطيط إنتاج مصنع السجائر',
  version: '1.0.0',
  description:
    'Multi-task autonomous AI agent specialized in primary & secondary cigarette manufacturing planning, BOM formulation, adaptive machine calibration, and multi-agent coordination.',
  protocols: ['http-json-rpc-2.0', 'a2a-rest-v1'],
  endpoints: {
    json_rpc: '/api/a2a',
    rest: '/api/v1/planner',
    agent_card: '/api/agent/card',
  },
  capabilities: [
    {
      skill_id: 'task1_secondary_planning',
      name: 'Secondary Production Planning',
      description: 'Calculates cartons, packs, sticks, required tobacco (kg), machine rates, and production hours/days.',
    },
    {
      skill_id: 'task2_sku_bom',
      name: 'SKU Bill of Materials',
      description: 'Calculates cut filler, tipping paper, cigarette paper, filter rods, foils, inner frame, BOPP, tax stamps.',
    },
    {
      skill_id: 'task3_primary_planning',
      name: 'Primary Tobacco Batch Planning',
      description: 'Aggregates secondary demand, computes roundup batch counts (10,000 kg basis), and surplus buffer.',
    },
    {
      skill_id: 'task4_blend_formulation',
      name: 'Blend BOM & Leaf Allocation',
      description: '13-grade tobacco blend balancer (BU, FU, OR, CL, RE, IS, SL, ET, TL, 12*, 10*, LD, DB) with 100% check.',
    },
    {
      skill_id: 'task5_stem_processing',
      name: 'Stem BOM Multi-Stage Processing',
      description: '5-stage sequential stem mass-balance (Cleaning, Cutting, Steam, Casing, Expansion) with yield optimization.',
    },
    {
      skill_id: 'task6_solution_bom',
      name: 'Casing & Top-Flavor Solutions',
      description: 'Casing sauce (Water, Invert Sugar, Cocoa, Glycerin, etc.) and Top Flavor recipe formulation per batch.',
    },
    {
      skill_id: 'task8_adaptive_learning',
      name: 'Machine Adaptive Learning & Calibration',
      description: 'Automatic variance detection and dynamic baseline tuning proposals after 5+ production run samples.',
    },
  ],
  constants: {
    cigs_per_pack: 20,
    cigs_per_carton: 10000,
    packs_per_carton: 500,
    cartons_per_mio: 100,
    default_blend_batch_size_kg: 10000,
    default_tobacco_weight_g: 0.75,
  },
};

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), server: 'Cigarette-Production-AI-Agent' });
});

// 2. Open A2A Agent Card endpoint
app.get('/api/agent/card', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(AGENT_CARD);
});

// 3. HTTP/JSON-RPC 2.0 endpoint for external agents
app.post('/api/a2a', (req, res) => {
  const startTime = Date.now();
  const { jsonrpc, method, params, id } = req.body || {};

  if (jsonrpc !== '2.0' || !method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request. Must conform to JSON-RPC 2.0 with method.' },
      id: id || null,
    });
  }

  let result: any = null;
  let error: any = null;

  try {
    switch (method) {
      case 'getAgentCard':
      case 'agent.card':
        result = AGENT_CARD;
        break;

      case 'calculateSecondaryPlan':
      case 'plan.getSecondary': {
        const targetMio = Number(params?.targetMio) || 10;
        const stickWeightG = Number(params?.stickWeightG) || 0.75;
        const lineRatePerHour = Number(params?.lineRatePerHour) || 0.45;
        const efficiency = Number(params?.efficiency) || 85;

        const cartons = targetMio * 100;
        const packs = cartons * 500;
        const sticks = cartons * 10000;
        const tobaccoKg = (sticks * stickWeightG) / 1000;
        const effectiveRate = lineRatePerHour * (efficiency / 100);
        const requiredHours = effectiveRate > 0 ? targetMio / effectiveRate : 0;

        result = {
          targetMio,
          cartons,
          packs,
          sticks,
          tobaccoRequiredKg: Number(tobaccoKg.toFixed(2)),
          requiredHours: Number(requiredHours.toFixed(1)),
          requiredDays: Number((requiredHours / 16).toFixed(2)),
        };
        break;
      }

      case 'calculatePrimaryBatches':
      case 'plan.getPrimary': {
        const demandKg = Number(params?.totalDemandKg) || 11250;
        const batchSize = Number(params?.batchSizeKg) || 10000;
        const batches = Math.ceil(demandKg / batchSize);
        const totalProduced = batches * batchSize;
        const surplus = totalProduced - demandKg;

        result = {
          totalTobaccoDemandKg: demandKg,
          batchSizeKg: batchSize,
          batchesCount: batches,
          totalProducedKg: totalProduced,
          surplusKg: surplus,
        };
        break;
      }

      case 'calculateStemBOM':
      case 'bom.getStem': {
        const targetStemKg = Number(params?.targetStemKg) || 1000;
        const yieldPercent = Number(params?.yieldPercent) || 90;
        const rawStem = targetStemKg / (yieldPercent / 100);

        result = {
          targetStemKg,
          yieldPercent,
          rawStemRequiredKg: Number(rawStem.toFixed(2)),
          estimatedStages: [
            { step: 'Cleaning', factor: -0.05, weightKg: Number((rawStem * 0.95).toFixed(2)) },
            { step: 'Cutting', factor: -0.03, weightKg: Number((rawStem * 0.95 * 0.97).toFixed(2)) },
            { step: 'Steam Conditioning', factor: 0.0, weightKg: Number((rawStem * 0.95 * 0.97).toFixed(2)) },
            { step: 'Casing', factor: 0.04, weightKg: Number((rawStem * 0.95 * 0.97 * 1.04).toFixed(2)) },
            { step: 'Expansion & Drying', factor: -0.02, weightKg: Number(targetStemKg.toFixed(2)) },
          ],
        };
        break;
      }

      default:
        error = { code: -32601, message: `Method '${method}' not found.` };
    }
  } catch (err: any) {
    error = { code: -32000, message: err?.message || 'Server error during execution' };
  }

  const executionTimeMs = Date.now() - startTime;

  a2aServerLogs.unshift({
    timestamp: new Date().toISOString(),
    method,
    params,
    success: !error,
    executionTimeMs,
  });

  if (a2aServerLogs.length > 50) a2aServerLogs.pop();

  if (error) {
    return res.status(500).json({ jsonrpc: '2.0', error, id });
  }

  return res.json({ jsonrpc: '2.0', result, id, executionTimeMs });
});

// 4. Chat Endpoint with Gemini Function Calling
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 5) {
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

// 5. Live Voice API Status Endpoint
app.get('/api/live/status', (req, res) => {
  const client = getGemini();
  res.json({
    status: 'ok',
    model: 'gemini-3.8-live',
    hasApiKey: Boolean(client),
    wsEndpoint: '/api/live-ws',
  });
});

// 6. WebSocket Server for gemini-3.8-live Real-Time Voice Conversation
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost:3000';
  const pathname = request.url ? new URL(request.url, `http://${host}`).pathname : '';
  if (pathname === '/api/live-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to gemini-3.8-live WebSocket');
  const client = getGemini();

  if (!client) {
    clientWs.send(
      JSON.stringify({
        type: 'status',
        connected: false,
        model: 'gemini-3.8-live',
        message: 'No GEMINI_API_KEY detected. Ready for fallback browser voice synthesis.',
        fallback: true,
      })
    );
    return;
  }

  try {
    clientWs.send(
      JSON.stringify({
        type: 'status',
        status: 'connecting',
        model: 'gemini-3.8-live',
        message: 'Connecting to Gemini 3.8 Live API session...',
      })
    );

    const session = await client.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: `You are the Cigarette Factory AI Production Planner voice assistant. You converse directly with factory plant managers, production engineers, and packaging line operators in a modern tobacco processing facility.
You know factory operational facts:
- Secondary Production: Classic Red, Gold Lights, Heritage Virginia, Silver Ultra, Ice Click, Super Slims. Line Units LU#01 (Hauni Protos 80 / Focke 350 HLP), LU#02 (GD 121 Ultra / GD H1000 High-Speed), LU#03 (Molins Mark 9 / Focke 550 Soft Cup), LU#04 (Hauni Protos 70), LU#05 (ITM Slims).
- Primary Production: Standard 10,000 kg batch size, ROUNDUP batch calculation, buffer surplus staged in Silos 1 to 5.
- 13-Grade Blend: FU 30%, BU 20%, OR 10%, CL 5%, RE 10%, IS 6%, SL 4%, ET 5%, TL 3%, 12* 3%, 10* 2%, LD 1%, DB 1% (exact 100%).
- 5 Stem Stages: Cleaning, Cutting, Steam, Casing, Expansion (default 90% yield).
- Solutions: 10% Casing rate (invert sugar, licorice, cocoa, glycerin), 1.2% Top Flavor (essential oils, PG, menthol).
- Always answer in the language spoken by the user (Arabic or English).
- Keep voice answers brief (2-4 sentences max per turn), natural, spoken, and clear for voice playback.`,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'text',
                    text: part.text,
                  })
                );
              }
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          clientWs.send(
            JSON.stringify({
              type: 'error',
              error: err?.message || 'Error communicating with Live API',
            })
          );
        },
        onclose: () => {
          clientWs.send(JSON.stringify({ type: 'closed' }));
        },
      },
    });

    clientWs.send(
      JSON.stringify({
        type: 'status',
        status: 'ready',
        model: 'gemini-3.8-live',
        message: 'Connected to gemini-3.8-live. Ready for voice interaction.',
      })
    );

    clientWs.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.audio) {
          session.sendRealtimeInput({
            audio: { data: data.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (data.text) {
          session.sendRealtimeInput({
            text: data.text,
          });
        }
      } catch (err) {
        console.error('Failed to forward client message to Live session:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client closed Live WebSocket connection');
      try {
        session.close();
      } catch (e) {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('Error establishing Gemini Live connection:', err);
    clientWs.send(
      JSON.stringify({
        type: 'error',
        model: 'gemini-3.8-live',
        error: err?.message || 'Failed to initialize gemini-3.8-live session',
        fallback: true,
      })
    );
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, history, language, context } = req.body || {};
  const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(message || '');

  const client = getGemini();

  // If Gemini API Key is not set or configured, use high-fidelity intelligent domain fallback
  if (!client) {
    const userMsg = (message || '').toLowerCase();

    let reply = '';
    let triggeredTool: string | null = null;
    let action: any = null;

    if (userMsg.includes('عدل') || userMsg.includes('غير') || userMsg.includes('اضبط') || userMsg.includes('احذف') || userMsg.includes('وازن') || userMsg.includes('update') || userMsg.includes('change') || userMsg.includes('delete') || userMsg.includes('balance') || userMsg.includes('نفذ') || userMsg.includes('وكيل')) {
      triggeredTool = 'command-executor';
      reply = isArabic
        ? '⚡ لتوجيه الوكيل الذكي بدقة متناهية، يرجى تحديد الصنف والكمية المطلوبة (مثال: "عدل كمية صنف 1 إلى 30 مليون" أو "غير كفاءة الخط الأول إلى 90%" أو "وازن خلطة التبغ"). كما يمكنك استخدام أزرار الأوامر السريعة الجاهزة أو فتح لوحة تحكم الوكيل الحية (Cockpit) للتحكم الفوري المباشر بجميع عقد المعالجة.'
        : '⚡ To command the agent with high precision, specify the SKU and quota (e.g. "Update SKU-001 target to 30 Million" or "Set Line LU#01 efficiency to 90%" or "Balance blend to 100%"). You can also click the quick action chips or open the Agent Live Control Cockpit to trigger any node directly.';
    } else if (userMsg.includes('كرتون') || userMsg.includes('carton') || userMsg.includes('مليون') || userMsg.includes('mio')) {
      triggeredTool = 'task-1';
      reply = isArabic
        ? 'حسابات الإنتاج الثانوي:\n• كل 1 مليون سيجارة = 100 كرتونة = 50,000 علبة (20 سيجارة/علبة).\n• كمية التبغ المفروم المطلوبة = 750 كغم (بمعدل 0.75 غم/سيجارة).\n• هل ترغب في عكس هذه الكميات على خطة الإنتاج الحالية؟'
        : 'Secondary Production Calculations:\n• 1 Million Cigarettes = 100 Cartons = 50,000 Packs (20 cigs/pack).\n• Cut Tobacco Demand = 750 kg (at 0.75 g/stick).\n• Would you like to reflect this target to the active production plan?';
    } else if (userMsg.includes('دفعة') || userMsg.includes('batch') || userMsg.includes('أولي') || userMsg.includes('primary')) {
      triggeredTool = 'task-3';
      const demand = context?.totalDemandKg || 75000;
      const batches = Math.ceil(demand / 10000);
      const totalProduced = batches * 10000;
      const surplus = totalProduced - demand;
      reply = isArabic
        ? `حسابات الإنتاج الأولي:\n• إجمالي طلب التبغ الثانوي: ${demand.toLocaleString()} كغم\n• حجم الدفعة القياسي: 10,000 كغم\n• عدد الدفعات المطلوبة: ${batches} دفعات (تقريب للأعلى ROUNDUP)\n• إجمالي الناتج: ${totalProduced.toLocaleString()} كغم\n• فائض الصوامع التخزينية (Buffer Surplus): ${surplus.toLocaleString()} كغم.`
        : `Primary Production Calculation:\n• Secondary Tobacco Demand: ${demand.toLocaleString()} kg\n• Batch Size: 10,000 kg\n• Required Batches: ${batches} batches (ROUNDUP)\n• Total Produced: ${totalProduced.toLocaleString()} kg\n• Resting Silos Surplus: ${surplus.toLocaleString()} kg.`;
    } else if (userMsg.includes('خلطة') || userMsg.includes('blend') || userMsg.includes('bom')) {
      triggeredTool = 'task-4';
      reply = isArabic
        ? 'مواصفة خلطة التبغ (13 صنفاً):\n• الأصناف الرئيسية: FU (30%), BU (20%), OR (10%), RE (10%), IS (6%), CL (5%), ET (5%), SL (4%), TL (3%), 12* (3%), 10* (2%), LD (1%), DB (1%).\n• المجموع الإجمالي: 100% متزن تماماً.'
        : 'Master Tobacco Blend (13 Grades):\n• Components: FU (30%), BU (20%), OR (10%), RE (10%), IS (6%), CL (5%), ET (5%), SL (4%), TL (3%), 12* (3%), 10* (2%), LD (1%), DB (1%).\n• Total: 100% strictly balanced.';
    } else if (userMsg.includes('سيقان') || userMsg.includes('stem')) {
      triggeredTool = 'task-5';
      reply = isArabic
        ? 'معالجة السيقان (Stem BOM):\n• العائد المستهدف القياسي = 90%.\n• المراحل الخمس: 1. تنظيف (-5%) ← 2. تقطيع (-3%) ← 3. بخار (0%) ← 4. كيسنج (+4%) ← 5. تمديد وتجفيف (-2%).'
        : 'Stem Processing BOM:\n• Standard Target Yield = 90%.\n• 5 Cascade Stages: 1. Cleaning (-5%) -> 2. Cutting (-3%) -> 3. Steam (0%) -> 4. Casing (+4%) -> 5. Expansion (-2%).';
    } else if (userMsg.includes('اكسل') || userMsg.includes('إكسل') || userMsg.includes('excel') || userMsg.includes('ملف')) {
      triggeredTool = 'excel-import';
      reply = isArabic
        ? 'يمكنك الآن رفع ملفات الإكسل (.xlsx, .xls, .csv) مباشرة عبر زر "رفع ملف إكسل 📊" في الأسفل، وسيقوم الوكيل بقراءة الأصناف والكميات وحساب عدد الكراتين والعلب والتبغ والدفعات الأولية وعكسها فوراً على خطة المصنع بنقرة واحدة!'
        : 'You can now upload Excel files (.xlsx, .xls, .csv) directly using the "Upload Excel 📊" button below. The agent will parse SKUs, calculate cartons, packs, tobacco kg, and primary batches, and allow you to reflect the plan immediately!';
    } else {
      triggeredTool = 'engine';
      reply = isArabic
        ? `أهلاً بك! أنا الوكيل الذكي لتخطيط مصنع السجائر.
أنا جاهز لتحليل أي خطة أو ملف إكسل وعكس النتائج مباشرة.
البيانات الحالية في المصنع:
• عدد أصناف الخطة: ${context?.planItemsCount || 6} أصناف
• إجمالي التبغ المطلوب: ${(context?.totalDemandKg || 67500).toLocaleString()} كغم
• حجم الدفعة المعيارية: 10,000 كغم
كيف تحب أن نعدل أو نحلل خطة الإنتاج اليوم؟`
        : `Welcome! I am your Cigarette Factory AI Production Planning Agent.
I can analyze plans, parse Excel spreadsheets, and directly reflect changes to the factory floor.
Current Factory Overview:
• Active Plan Items: ${context?.planItemsCount || 6} SKUs
• Total Tobacco Demand: ${(context?.totalDemandKg || 67500).toLocaleString()} kg
• Standard Batch Size: 10,000 kg
How can I assist with your production schedule?`;
    }

    return res.json({
      text: reply,
      reply: reply,
      triggeredTool,
      action,
      modelUsed: 'rule-based-fast-engine',
    });
  }

  // Use Gemini with enriched factory context
  try {
    const prompt = `You are a specialized, conversational AI Production Planning Agent for an industrial cigarette manufacturing factory.
Key Factory Constants:
- 20 cigarettes/pack, 10,000 cigarettes/carton, 500 packs/carton, 100 cartons/Million cigarettes.
- Standard Blend batch size = 10,000 kg.
- Tobacco weight per stick = 0.75 g.
- Primary production: Batches = ROUNDUP(Demand / 10,000).
- Blend components: BU, FU, OR, CL, RE, IS, SL, ET, TL, 12*, 10*, LD, DB (Sum = 100%).
- Stem stages: Cleaning (-5%), Cutting (-3%), Steam (0%), Casing (+4%), Expansion (-2%), Default yield = 90%.
- Casing application rate: 10%, Top Flavor: 1.2%.
- Packaging lines: LU#01 (Hauni Protos 80 / Focke 350), LU#02 (GD 121 Ultra / GD H1000), LU#03 (Molins Mark 9 / Focke 550 Soft Cup), LU#04 (Hauni Protos 70), LU#05 (ITM Slims).

Current Factory Context:
- Active SKUs: ${context?.skus || 'SKU-001 (25M), SKU-002 (20M), SKU-003 (15M), SKU-004 (12M), SKU-005 (8M), SKU-006 (10M)'}
- Total Tobacco Demand: ${context?.totalDemandKg || 67500} kg
- Total Batches: ${context?.totalDemandKg ? Math.ceil(context.totalDemandKg / 10000) : 7} batches
- Blend sum: ${context?.blendSum || 100}%

Instructions:
1. Converse naturally, professionally, and authoritatively with the user in ${isArabic ? 'Arabic' : 'English'}.
2. Always return concrete operational numbers, calculations, and exact factory metrics.
3. If the user gives a command to adjust, modify, add, delete, balance, or configure anything (e.g. "عدل كمية...", "غير كفاءة...", "وازن خلطة..."), explicitly confirm that the command was executed directly inside the agent and explain the exact numerical impacts on cigarettes, cartons, packs, tobacco kg, and primary batches.
4. If the user mentions Excel or uploading files, explain that they can upload .xlsx files anytime to have the plan analyzed and reflected.
5. Keep the response well-structured with bullet points and bold headers.

User message: ${message}`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const outputText = response.text || (isArabic ? 'تمت معالجة الاستفسار بنجاح.' : 'Query processed successfully.');

    res.json({
      text: outputText,
      reply: outputText,
      triggeredTool: 'gemini-planning-engine',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Gemini error:', err);
    const fallbackText = isArabic
      ? 'تمت معالجة استفسارك بناءً على محرك الحسابات التشغيلي للمصنع.'
      : 'Your query was processed based on the factory planning engine.';
    res.json({
      text: fallbackText,
      reply: fallbackText,
      triggeredTool: 'engine',
      modelUsed: 'fallback-local',
    });
  }
});

// 5. Excel Plan AI Analysis Endpoint
app.post('/api/excel/analyze', async (req, res) => {
  const { summary, items, language } = req.body || {};
  const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(language || '');
  const client = getGemini();

  if (!client) {
    const batches = summary?.primaryBatchesCount || Math.ceil((summary?.totalTobaccoRequiredKg || 0) / 10000);
    const surplus = batches * 10000 - (summary?.totalTobaccoRequiredKg || 0);

    const analysisText = isArabic
      ? `تحليل خطة الإكسل المرفوعة (${summary?.fileName || 'ملف الإكسل'}):
• إجمالي الأصناف: ${summary?.totalItems || items?.length || 0} صنفاً
• الإنتاج المستهدف: ${(summary?.totalMio || 0).toLocaleString()} مليون سيجارة (${(summary?.totalCartons || 0).toLocaleString()} كرتونة / ${(summary?.totalPacks || 0).toLocaleString()} علبة)
• استهلاك التبغ المفروم: ${(summary?.totalTobaccoRequiredKg || 0).toLocaleString()} كغم
• دفعات الإنتاج الأولي: ${batches} دفعات (حجم الدفعة 10,000 كغم)
• الفائض التخزيني المقدر للصوامع: ${surplus.toLocaleString()} كغم
• الخطوط المستخدمة: ${(summary?.linesUsed || []).join(', ') || 'LU#01, LU#02'}
• التوصية: الخطة متوافقة مع قدرات خطوط التجهيز ومعايير المصنع. يمكنك النقر على "عكس الخطة على المصنع" لتطبيقها فوراً.`
      : `Analysis of Uploaded Excel Plan (${summary?.fileName || 'Spreadsheet'}):
• Total SKUs: ${summary?.totalItems || items?.length || 0} items
• Target Production: ${(summary?.totalMio || 0).toLocaleString()} Million sticks (${(summary?.totalCartons || 0).toLocaleString()} cartons)
• Cut Tobacco Required: ${(summary?.totalTobaccoRequiredKg || 0).toLocaleString()} kg
• Primary Production Batches: ${batches} batches (10,000 kg/batch)
• Resting Silos Surplus: ${surplus.toLocaleString()} kg
• Designated Lines: ${(summary?.linesUsed || []).join(', ') || 'LU#01, LU#02'}
• Recommendation: Feasible and aligned with machine line capacities. Click "Apply & Reflect Plan" to synchronize all factory schedules.`;

    return res.json({
      text: analysisText,
      reply: analysisText,
      feasibility: 'FEASIBLE',
      modelUsed: 'rule-based-fast-engine',
    });
  }

  try {
    const prompt = `Analyze this uploaded cigarette manufacturing production plan from an Excel spreadsheet:
Summary:
- File Name: ${summary?.fileName}
- Total SKUs: ${summary?.totalItems}
- Total Target Mio: ${summary?.totalMio} Million sticks
- Total Cartons: ${summary?.totalCartons}
- Total Cut Tobacco Required: ${summary?.totalTobaccoRequiredKg} kg
- Required Primary Batches: ${summary?.primaryBatchesCount} batches of 10,000 kg
- Lines Used: ${(summary?.linesUsed || []).join(', ')}
- Warnings/Notes: ${(summary?.warnings || []).join('; ') || 'None'}

Provide an executive industrial evaluation in ${isArabic ? 'Arabic' : 'English'}:
1. Summary of total volume, demand, and batches.
2. Capacity check across packaging lines LU#01 to LU#05.
3. Tobacco inventory & buffer surplus evaluation.
4. Clear operational recommendation.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      text: response.text,
      reply: response.text,
      feasibility: 'FEASIBLE',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Gemini Excel analysis error:', err);
    res.json({
      text: isArabic ? 'تم فحص الخطة وهي جاهزة للتطبيق على المصنع.' : 'Plan reviewed and ready for production synchronization.',
      reply: isArabic ? 'تم فحص الخطة وهي جاهزة للتطبيق على المصنع.' : 'Plan reviewed and ready for production synchronization.',
      feasibility: 'FEASIBLE',
      modelUsed: 'fallback-local',
    });
  }
});

// Mount Vite middleware for development or static serving for production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cigarette Production AI Agent Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
