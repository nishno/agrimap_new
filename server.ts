import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export const PRIMARY_GEMINI_MODEL = 'gemini-3.8-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-flash-latest';

let serverGenAI: GoogleGenAI | null = null;
let currentServerKeyUsed = '';

function getServerGenAI(customKey?: string): GoogleGenAI {
  const activeKey = (
    customKey ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();

  if (!activeKey) {
    throw new Error('SERVER_GEMINI_KEY_MISSING');
  }

  if (!serverGenAI || currentServerKeyUsed !== activeKey) {
    serverGenAI = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    currentServerKeyUsed = activeKey;
  }

  return serverGenAI;
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // 1. Health & Server Status Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      time: new Date().toISOString(),
      service: 'AgriMap Pro Full-Stack Core',
      hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY)
    });
  });

  // 2. Gemini Status & Verification Endpoint
  app.get('/api/gemini/status', (req, res) => {
    const hasKey = !!(process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY);
    res.json({
      ok: true,
      hasServerKey: hasKey,
      defaultModel: PRIMARY_GEMINI_MODEL,
      fallbackModel: FALLBACK_GEMINI_MODEL
    });
  });

  // 3. Gemini Test Connection Endpoint
  app.post('/api/gemini/test', async (req, res) => {
    const startTime = Date.now();
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
    try {
      const ai = getServerGenAI(customKey);
      const result = await ai.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: "Respond with the word 'OK' to verify connection."
      });
      const elapsed = Date.now() - startTime;
      return res.json({
        success: true,
        ok: true,
        message: `Connection successful! Model ${PRIMARY_GEMINI_MODEL} responded: "${result.text?.trim() || 'OK'}"`,
        modelUsed: PRIMARY_GEMINI_MODEL,
        latencyMs: elapsed
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      return res.status(200).json({
        success: false,
        ok: false,
        message: errMsg.includes('SERVER_GEMINI_KEY_MISSING')
          ? 'No server-side Gemini API key is configured. Please provide a key or configure GEMINI_API_KEY.'
          : `Gemini connection failed: ${errMsg.slice(0, 180)}`
      });
    }
  });

  // 4. Primary Gemini Generation Proxy
  app.post('/api/gemini/call', async (req, res) => {
    const { contents, config, model } = req.body || {};
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;

    if (!contents) {
      return res.status(400).json({ success: false, error: 'Missing contents parameter' });
    }

    let ai: GoogleGenAI;
    try {
      ai = getServerGenAI(customKey);
    } catch (keyErr: any) {
      return res.status(401).json({
        success: false,
        error: 'SERVER_GEMINI_KEY_MISSING',
        message: 'Server Gemini API key is missing. Add GEMINI_API_KEY in environment or supply x-gemini-api-key header.'
      });
    }

    const targetModel = model || PRIMARY_GEMINI_MODEL;

    const executeCall = async (modelToUse: string) => {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents,
        config
      });

      return {
        success: true,
        text: response.text,
        candidates: response.candidates,
        modelUsed: modelToUse
      };
    };

    try {
      try {
        const result = await executeCall(targetModel);
        return res.json(result);
      } catch (primaryErr: any) {
        const errStr = primaryErr?.message || String(primaryErr);
        if ((errStr.includes('404') || errStr.includes('not found')) && targetModel !== FALLBACK_GEMINI_MODEL) {
          console.warn(`[Gemini Server Proxy] Model ${targetModel} not found, retrying with ${FALLBACK_GEMINI_MODEL}...`);
          const fallbackResult = await executeCall(FALLBACK_GEMINI_MODEL);
          return res.json(fallbackResult);
        }
        throw primaryErr;
      }
    } catch (execErr: any) {
      console.error('[Gemini Server Proxy Error]:', execErr?.message || execErr);
      const errMsg = execErr?.message || String(execErr);
      const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('prepayment credits');
      const isForbidden = errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED');
      const isInvalid = errMsg.includes('400') || errMsg.includes('API_KEY_INVALID');

      return res.status(isQuota ? 429 : isForbidden ? 403 : isInvalid ? 400 : 500).json({
        success: false,
        error: errMsg,
        isQuotaDepleted: isQuota
      });
    }
  });

  // 5. Local Server Sync Endpoints (for data persistence mirror & offline sync)
  app.get('/api/sync/test', (req, res) => {
    res.json({
      status: 'ok',
      message: 'AgriMap Core Server node is active and reachable.'
    });
  });

  app.post('/api/sync', (req, res) => {
    const { path: dbPath, type, data, deviceId } = req.body || {};
    console.log(`[Server Sync] Received [${type}] for "${dbPath}" from Device: ${deviceId}`);
    res.json({ status: 'success', synced: true });
  });

  // 6. Vite Mounting (Dev) or Static File Serving (Prod)
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(`🍇 AgriMap Pro Full-Stack Server active on port ${PORT}          `);
    console.log(`📡 URL: http://localhost:${PORT}                                `);
    console.log(`🤖 Server-Side Gemini API Proxy: /api/gemini/call active        `);
    console.log(`================================================================`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL SERVER ERROR]:', err);
  process.exit(1);
});
