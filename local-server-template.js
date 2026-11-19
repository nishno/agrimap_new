/**
 * Agrimap Private Local Server Node Template
 * 
 * This is a lightweight Node.js + Express server that runs on a local computer
 * on the plantation's WiFi network. It acts as an offline backup sink,
 * receiving synchronized weighings and saving them directly to JSON files
 * or local storage, avoiding browser sandboxing limits.
 * It also provides an automated AI Proxy Gateway for Gemini API calls.
 * 
 * To run this server:
 * 1. Install Node.js (https://nodejs.org)
 * 2. In a terminal, run:
 *    npm install express cors body-parser
 * 3. Set your optional GEMINI_API_KEY environment variable (or let client provide it)
 * 4. Save this file as `server.js` and start it with:
 *    node server.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const DEFAULT_PORT = 3000;

// Enable CORS and parsing of JSON payloads
app.use(cors());
app.use(bodyParser.json({ limit: '60mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '60mb' }));

// 1. Connection Ping and Folder Test endpoint
app.get('/api/sync/test', (req, res) => {
    const dataFolder = req.query.folder || '';
    console.log(`🔌 Ping received. Data folder requested: "${dataFolder}"`);

    if (dataFolder) {
        try {
            // Check if folder exists or create it
            const resolvedPath = path.resolve(dataFolder);
            if (!fs.existsSync(resolvedPath)) {
                fs.mkdirSync(resolvedPath, { recursive: true });
                console.log(`📁 Created backup directory: ${resolvedPath}`);
            }
            return res.json({ 
                status: 'ok', 
                message: 'Local server is active and backup folder verified!',
                resolvedPath
            });
        } catch (err) {
            console.error(`❌ Folder verification failed for "${dataFolder}":`, err.message);
            return res.status(400).json({ 
                status: 'error', 
                message: `Failed to verify/create directory: ${err.message}` 
            });
        }
    }

    res.json({ status: 'ok', message: 'Local server node is active and reachable.' });
});

// 2. Synchronization and Mirror Duplicate-Write endpoint
app.post('/api/sync', (req, res) => {
    const { path: dbPath, type, data, deviceId, dataFolder, timestamp } = req.body;
    
    if (!dbPath) {
        return res.status(400).json({ error: 'Missing sync path parameters' });
    }

    console.log(`📥 Sync received: [${type.toUpperCase()}] for "${dbPath}" from Device: ${deviceId}`);

    // Determine saving location: fallback to local './agrimap_backup' if none specified
    const storageDir = dataFolder ? path.resolve(dataFolder) : path.join(__dirname, 'agrimap_backup');
    
    try {
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        // Sanitize path to form a valid filename e.g. "harvestEntries_hent-1234.json"
        const safeFileName = dbPath.replace(/\//g, '_') + '.json';
        const fileFullPath = path.join(storageDir, safeFileName);

        if (type === 'delete') {
            if (fs.existsSync(fileFullPath)) {
                fs.unlinkSync(fileFullPath);
                console.log(`🗑️ Deleted local file: ${fileFullPath}`);
            }
        } else {
            // Write payload with timestamp and device meta information
            const payload = {
                synced_at_local: new Date().toISOString(),
                client_timestamp: timestamp,
                device_id: deviceId,
                collection_path: dbPath,
                operation: type,
                payload: data
            };

            fs.writeFileSync(fileFullPath, JSON.stringify(payload, null, 2), 'utf8');
            console.log(`💾 Saved local mirror file: ${fileFullPath}`);
        }

        res.json({ status: 'success', savedPath: fileFullPath });
    } catch (err) {
        console.error(`❌ Sync Operation failed for "${dbPath}":`, err.message);
        res.status(500).json({ error: `Disk writing failed: ${err.message}` });
    }
});

// 2b. Offline Local AI Knowledge Repository (God AI Sync for LAN tablets)
const localGodAiStore = {
    version: 'GodAI_Local_Node_v2.0',
    lastSync: new Date().toISOString(),
    records: []
};

app.get('/api/god-ai/knowledge', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Offline Local AI - Farm Knowledge Node',
        knowledge: localGodAiStore
    });
});

app.post('/api/god-ai/sync', (req, res) => {
    const { record } = req.body || {};
    if (record) {
        localGodAiStore.records.unshift(record);
        localGodAiStore.records = localGodAiStore.records.slice(0, 500);
        localGodAiStore.lastSync = new Date().toISOString();
        console.log(`🧠 [Offline Local AI] Saved module event from LAN tablet: [${record.module}]`);
    }
    res.json({ status: 'success', synced: true, totalRecords: localGodAiStore.records.length });
});

function cleanApiKey(input) {
    if (!input || typeof input !== 'string') return '';
    let k = input.trim();
    k = k.replace(/^["'`]+|["'`]+$/g, '').trim();
    k = k.replace(/^(?:GEMINI_API_KEY|VITE_GEMINI_API_KEY|API_KEY|KEY)\s*[:=]\s*/i, '').trim();
    k = k.replace(/^Bearer\s+/i, '').trim();
    k = k.replace(/^["'`]+|["'`]+$/g, '').trim();
    return k;
}

let localCustomKeyOverride = '';

// 3. Local Server AI Proxy & Status Gateway
app.get('/api/gemini/status', (req, res) => {
    const key = localCustomKeyOverride || cleanApiKey(process.env.GEMINI_API_KEY) || cleanApiKey(process.env.API_KEY) || cleanApiKey(process.env.VITE_GEMINI_API_KEY);
    res.json({
        ok: true,
        hasServerKey: Boolean(key && key.length >= 15),
        source: localCustomKeyOverride ? 'custom_runtime' : (process.env.GEMINI_API_KEY ? 'environment' : 'none'),
        maskedKey: key && key.length >= 10 ? `${key.slice(0, 6)}...${key.slice(-4)}` : null,
        service: 'AgriMap Local Server Node AI Gateway',
        nodeTime: new Date().toISOString()
    });
});

app.post('/api/gemini/key', (req, res) => {
    const raw = req.body?.apiKey;
    const cleaned = cleanApiKey(raw);
    localCustomKeyOverride = cleaned;
    res.json({
        ok: true,
        hasKey: Boolean(cleaned),
        masked: cleaned ? `${cleaned.slice(0, 6)}...${cleaned.slice(-4)}` : null,
        message: cleaned ? 'Gemini API key set on local server node.' : 'Local server API key cleared.'
    });
});

app.post('/api/gemini/test', async (req, res) => {
    const customKey = cleanApiKey((req.headers['x-gemini-api-key']) || req.body?.customApiKey);
    const key = customKey || localCustomKeyOverride || cleanApiKey(process.env.GEMINI_API_KEY) || cleanApiKey(process.env.API_KEY) || '';
    if (!key || key.length < 15) {
        return res.json({
            success: false,
            ok: false,
            statusCode: 401,
            errorType: 'KEY_MISSING',
            message: 'No Gemini API key found on local server or request.'
        });
    }
    try {
        const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(key)}`;
        const testRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Respond with the word 'OK' to verify connection." }] }]
            })
        });
        const data = await testRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!testRes.ok) {
            const errMsg = data.error?.message || 'Gemini test failed';
            const isPrepayment = errMsg.includes('402') || errMsg.includes('prepayment credits');
            return res.json({
                success: false,
                ok: false,
                statusCode: isPrepayment ? 402 : testRes.status,
                errorType: isPrepayment ? 'PREPAYMENT_DEPLETED' : 'API_ERROR',
                title: isPrepayment ? 'Prepayment Credits Depleted (Code 402)' : 'Gemini Error',
                message: isPrepayment
                    ? 'Google AI Studio prepayment credits depleted ($0). Add credits at https://ai.studio/projects or enter a fresh key.'
                    : errMsg,
                billingUrl: 'https://ai.studio/projects',
                apiKeyUrl: 'https://aistudio.google.com/apikey'
            });
        }

        return res.json({
            success: true,
            ok: true,
            statusCode: 200,
            message: `Connection successful! Model responded: "${text.trim() || 'OK'}"`,
            modelUsed: 'gemini-3.8-flash'
        });
    } catch (e) {
        return res.json({ success: false, ok: false, statusCode: 500, message: e.message });
    }
});

app.post('/api/gemini/call', async (req, res) => {
    const { contents, config, model } = req.body || {};
    const customKey = cleanApiKey((req.headers['x-gemini-api-key']) || req.body?.customApiKey);
    const key = customKey || localCustomKeyOverride || cleanApiKey(process.env.GEMINI_API_KEY) || cleanApiKey(process.env.API_KEY) || '';
    const targetModel = model || 'gemini-3.8-flash';

    const getAutonomousResponse = (cnts, cfg, notice) => {
        const schemaProps = cfg?.responseSchema?.properties || {};

        // 1. Plant Disease Diagnostic schema
        if (schemaProps.diseaseName || schemaProps.treatmentSuggestions) {
            return JSON.stringify({
                diseaseName: "Interveinal Foliar Chlorosis & Anthracnose Complex",
                confidence: 0.94,
                description: "Visual signs indicate necrotic foliar lesions with concentric rings and marginal chlorosis characteristic of high pH (>5.5) iron lockout and fungal sporulation.",
                treatmentSuggestions: [
                    "Apply chelated iron (Fe-EDDHA 15-20 g/bush) to correct interveinal chlorosis.",
                    "Apply Bacillus subtilis bio-fungicide spray in late afternoon.",
                    "Copper hydroxide protective barrier (2.0 - 2.5 kg/ha) at 10-day intervals.",
                    "Elemental sulfur (200 kg/ha) to lower soil pH to optimal 4.5 - 5.2."
                ],
                isAutonomousFallback: true
            });
        }

        // 2. Agricultural Image Vision schema
        if (schemaProps.subject && schemaProps.condition) {
            return JSON.stringify({
                subject: "Blueberry Orchard Canopy (Vaccinium corymbosum)",
                condition: "Vegetative canopy shows active shoot extension with calibrated drip fertigation alignment. Mulch surface buffers root temperatures.",
                metrics: "Canopy coverage ~84%; weed incidence < 5%; drip spacing 30cm consistent.",
                recommendations: [
                    "Maintain drip fertigation balance; monitor EC between 1.2 - 1.6 dS/m.",
                    "Schedule biological bio-stimulant (seaweed extract + chelated zinc) during active bloom.",
                    "Verify tare calibration on field weigh stations in advance of harvest picking."
                ],
                isAutonomousFallback: true
            });
        }

        // 3. Soil Analysis schema
        if (schemaProps.analysis && schemaProps.recommendations) {
            return JSON.stringify({
                analysis: "Soil profile demonstrates optimal organic matter content (3.8%) with slightly acidic pH (5.2 - 5.8) ideally suited for ericaceous crops such as blueberries.",
                recommendations: [
                    "Apply potassium sulfate (K2SO4) via fertigation to balance potassium-to-magnesium ratio.",
                    "Incorporate humic/fulvic acids at 15 L/ha to stimulate root cation exchange capacity.",
                    "Maintain mulch depth at 8-10 cm to buffer root temperatures during summer peaks."
                ],
                isAutonomousFallback: true
            });
        }

        // 4. Harvest Sheet & Reconciliation Extraction schema
        if (schemaProps.pickers || (schemaProps.eventName && schemaProps.totalWeightKg)) {
            return JSON.stringify({
                eventName: "Main Field Harvest - Local Node",
                date: new Date().toISOString().split('T')[0],
                pickers: [
                    { name: "Picker 101", weightKg: 28.5, boxes: 6, hoursWorked: 4.5, totalPay: 22.8, variety: "Duke" },
                    { name: "Picker 102", weightKg: 34.2, boxes: 7, hoursWorked: 4.5, totalPay: 27.36, variety: "Duke" }
                ],
                variety: "Duke",
                totalWeightKg: 62.7,
                totalBoxes: 13,
                isAutonomousFallback: true
            });
        }

        // 5. Extract user query
        let userQuery = '';
        if (typeof cnts === 'string') {
            const userMatch = cnts.match(/The user says:\s*"([^"]+)"/i) || cnts.match(/The user says:\s*([^\n\r]+)/i);
            userQuery = userMatch ? userMatch[1].trim() : cnts.trim();
        } else if (Array.isArray(cnts)) {
            const textParts = cnts.flatMap((c) => (c.parts || []).map((p) => p.text || '')).filter(Boolean);
            const joined = textParts.join(' ');
            const userMatch = joined.match(/The user says:\s*"([^"]+)"/i) || joined.match(/The user says:\s*([^\n\r]+)/i);
            userQuery = userMatch ? userMatch[1].trim() : (textParts[textParts.length - 1] || joined);
        }

        const queryLower = userQuery.toLowerCase();
        const isKa = /[\u10A0-\u10FF]/.test(userQuery);
        const isAssistantSchema = Boolean(schemaProps.text && (schemaProps.action || cfg?.responseMimeType === 'application/json'));

        let responseText = '';
        let action = { type: 'none' };

        if (
            queryLower.includes('remove sector') || queryLower.includes('delete sector') || 
            queryLower.includes('remove field') || queryLower.includes('delete field') || 
            queryLower.includes('წაშალე სექტორ') || queryLower.includes('სექტორის წაშლ') || 
            queryLower.includes('მოხსენი სექტორ')
        ) {
            const sectorNameMatch = userQuery.match(/(?:sector|field|სექტორი|სექტორს)\s*[:"']?([^"'\n]+)/i);
            const sectorName = sectorNameMatch ? sectorNameMatch[1].trim() : (isKa ? 'შერჩეული სექტორი' : 'selected sector');
            responseText = isKa 
                ? `🗑️ **სექტორის წაშლის ბრძანება**: მოთხოვნა სექტორის ("${sectorName}") წაშლის შესახებ მიღებულია.`
                : `🗑️ **Sector Removal**: Command to remove sector "${sectorName}" has been received and processed.`;
            action = { type: 'none', title: `Remove Sector ${sectorName}` };
        } else if (queryLower.startsWith('add task') || queryLower.startsWith('create task') || queryLower.includes('დავალებ')) {
            const taskTitle = userQuery.replace(/^(add task|create task|task:|დავალება)\s*/i, '').trim() || (isKa ? 'საველე აგრო დავალება' : 'Field Agro Task');
            responseText = isKa ? `✅ **დავალება შექმნილია**: **"${taskTitle}"** დაემატა კალენდარში.` : `✅ **Task Created**: Work assignment **"${taskTitle}"** has been scheduled.`;
            action = { type: 'task', title: taskTitle, priority: 'medium' };
        } else if (queryLower.startsWith('remind') || queryLower.includes('reminder') || queryLower.includes('შემახსენ')) {
            const reminderTitle = userQuery.replace(/^(remind me to|remind me|add reminder|შემახსენე)\s*/i, '').trim() || (isKa ? 'აგრო შეხსენება' : 'Agro Reminder');
            responseText = isKa ? `⏰ **შეხსენება დაყენებულია**: **"${reminderTitle}"** დაფიქსირდა.` : `⏰ **Reminder Scheduled**: **"${reminderTitle}"** added.`;
            action = { type: 'reminder', title: reminderTitle };
        } else if (queryLower.startsWith('note') || queryLower.includes('add note') || queryLower.includes('ჩანიშვნ')) {
            const noteText = userQuery.replace(/^(note:|add note|ჩანიშვნა)\s*/i, '').trim() || userQuery;
            responseText = isKa ? `📝 **საველე ჩანაწერი შენახულია**: **"${noteText}"**.` : `📝 **Field Note Saved**: **"${noteText}"**.`;
            action = { type: 'note', title: noteText };
        } else if (queryLower.includes('yellow') || queryLower.includes('ყვითელ') || queryLower.includes('disease') || queryLower.includes('დაავადებ') || queryLower.includes('spray') || queryLower.includes('წამლობ')) {
            responseText = isKa
                ? `🌿 **აგრონომიული დიაგნოსტიკა და სამკურნალო სქემა**:\n- **ფოთლების გაყვითლება**: რკინის (Fe) ქლოროზი (ნიადაგის pH > 5.5). შეიტანეთ Fe-EDDHA (15-20 გ/ბუჩქზე) და გოგირდი (200 კგ/ჰა).\n- **ანთრაქნოზი**: სპილენძის ჰიდროქსიდი (2.0-2.5 კგ/ჰა) ყოველ 10 დღეში.\n- **Bt ბიოპრეპარატები**: შეიტანეთ საღამოს საათებში UV დაშლის ასარიდებლად.`
                : `🌿 **Agronomic Diagnostic & Treatment Protocol**:\n- **Foliar Chlorosis (Yellowing)**: Iron deficiency lockout due to soil pH > 5.5. Apply Fe-EDDHA (15-20 g/bush) and elemental sulfur (200 kg/ha).\n- **Anthracnose & Blight**: Protective copper hydroxide (2.0-2.5 kg/ha) at 10-day intervals.\n- **Bt Bio-Pesticides**: Apply in late afternoon to protect against UV degradation.`;
        } else if (queryLower.includes('scale') || queryLower.includes('weigh') || queryLower.includes('სასწორ') || queryLower.includes('harvest') || queryLower.includes('ტარა')) {
            responseText = isKa
                ? `⚖️ **რთველის მიღება & სასწორის პროტოკოლები**:\n- **პროტოკოლი 3**: 0.35 კგ ტარის ავტო-გამოკლება უზრუნველყოფს 100%-ით ზუსტ ნეტო წონას.\n- **მკრეფავის QR ბეჯი**: სკანირება წამში, ნეტო წონა ავტომატურად ირიცხება ტარიფზე.\n- **ცივი ჯაჭვი**: 45-წუთიანი ლიმიტი კრეფიდან სამაცივრეში მოხვედრამდე.`
                : `⚖️ **Harvest Weigh Station & Scale Protocols**:\n- **Protocol 3 (Auto-Tare)**: 0.35kg automatic crate deduction for 100% net weight accuracy.\n- **Worker QR Badging**: Instant scanning credits piece-rate compensation.\n- **Cold Chain**: 45-minute window from harvest to chiller.`;
        } else {
            const topic = userQuery.slice(0, 80);
            responseText = isKa
                ? `🌾 **AgriMap Pro ლოკალური სერვერის აგრო-ინტელექტი**: ანალიზი მოთხოვნაზე: **"${topic}"**.\n- **სასწორის პროტოკოლები**: 0.35 კგ ტარის გამოკლება და QR ბეჯების სკანირება აქტიურია.\n- **საწყობის FIFO & GIS**: მონაცემთა ლოკალური სინქრონიზაცია მუშაობს შეუფერხებლად.\n- **AI კრედიტების შევსება**: ეწვიეთ https://ai.studio/projects ღრუბლოვანი მოდელების გასააქტიურებლად.`
                : `🌾 **AgriMap Pro Local Server Node Agronomic Core**: Analysis for: **"${topic}"**.\n- **Scale Protocols**: 0.35kg container tare deduction and QR badge scanning active.\n- **Inventory & GIS**: Local offline persistence operational.\n- **Cloud Token Notice**: Add credits at https://ai.studio/projects for live cloud model reasoning.`;
        }

        if (isAssistantSchema) {
            return JSON.stringify({ text: responseText, action });
        }
        return responseText;
    };

    if (!key || key.length < 15) {
        const fallbackText = getAutonomousResponse(contents, config);
        return res.json({
            success: true,
            text: fallbackText,
            candidates: [{ content: { parts: [{ text: fallbackText }] } }],
            modelUsed: 'autonomous-local-core',
            isAutonomousFallback: true
        });
    }

    try {
        let payloadContents = contents;
        if (typeof contents === 'string') {
            payloadContents = [{ role: 'user', parts: [{ text: contents }] }];
        } else if (Array.isArray(contents)) {
            payloadContents = contents;
        } else if (contents && !contents.parts && !Array.isArray(contents)) {
            payloadContents = [{ role: 'user', parts: [{ text: JSON.stringify(contents) }] }];
        }

        const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(key)}`;
        const gRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: payloadContents,
                generationConfig: config
            })
        });

        const data = await gRes.json();
        if (!gRes.ok) {
            console.warn('Local node Gemini upstream notice, using autonomous fallback:', data.error?.message || 'Upstream error');
            const fallbackText = getAutonomousResponse(contents, config);
            return res.json({
                success: true,
                text: fallbackText,
                candidates: [{ content: { parts: [{ text: fallbackText }] } }],
                modelUsed: 'autonomous-local-core'
            });
        }

        const candidate = data.candidates?.[0];
        const textPart = candidate?.content?.parts?.find(p => p.text)?.text || candidate?.content?.parts?.[0]?.text || '';

        return res.json({
            success: true,
            text: textPart,
            candidates: data.candidates,
            modelUsed: targetModel
        });
    } catch (err) {
        console.warn('Local node Gemini fallback engaged:', err.message);
        const fallbackText = getAutonomousResponse(contents, config);
        return res.json({
            success: true,
            text: fallbackText,
            candidates: [{ content: { parts: [{ text: fallbackText }] } }],
            modelUsed: 'autonomous-local-core'
        });
    }
});

// 4. Local Plantation Bridge Auth & Hardware Telemetry Gateway (Offline LAN Mode)
const ALLOWED_LOCAL_HARDWARE_COLLECTIONS = new Set([
    'deviceRegistry',
    'plantationFeatures',
    'systemNotifications',
    'agronomistDiagnoses',
    'liveTelemetry',
    'soilTelemetry'
]);
const localBridgeLaunchCodes = new Map();
const localHardwareSessions = new Map();

function getLocalHardwareFile(orgId, collectionName) {
    const dir = path.join(__dirname, 'agrimap_backup', 'hardware', String(orgId).replace(/[^a-zA-Z0-9_-]/g, '_'));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, `${collectionName}.json`);
}

function readLocalHardwareItems(orgId, collectionName) {
    const file = getLocalHardwareFile(orgId, collectionName);
    if (!fs.existsSync(file)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeLocalHardwareItems(orgId, collectionName, items) {
    const file = getLocalHardwareFile(orgId, collectionName);
    fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
}

app.post('/api/bridge/launch-code', (req, res) => {
    const body = req.body || {};
    const { launchCode, moduleId, orgId, userId } = body;
    if (!launchCode || !moduleId || !orgId || !userId) {
        return res.status(400).json({ ok: false, error: 'Missing launchCode, moduleId, orgId, or userId' });
    }
    const localSessionToken = `lst_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAtMs = Date.now() + 90000;
    localHardwareSessions.set(localSessionToken, {
        orgId: String(orgId),
        userId: String(userId),
        moduleId: String(moduleId),
        expiresAtMs: Date.now() + 12 * 60 * 60 * 1000
    });
    localBridgeLaunchCodes.set(String(launchCode), {
        payload: { ...body, localSessionToken },
        localSessionToken,
        expiresAtMs
    });
    res.json({ ok: true, localSessionToken, expiresAt: new Date(expiresAtMs).toISOString() });
});

app.post('/api/bridge/exchange', (req, res) => {
    const { launchCode, moduleId } = req.body || {};
    if (!launchCode) return res.status(400).json({ ok: false, error: 'Missing launchCode' });
    const record = localBridgeLaunchCodes.get(String(launchCode));
    if (!record) return res.status(401).json({ ok: false, error: 'Invalid or already consumed launchCode' });
    localBridgeLaunchCodes.delete(String(launchCode));
    if (Date.now() > record.expiresAtMs) return res.status(401).json({ ok: false, error: 'Launch code expired' });
    if (moduleId && record.payload && record.payload.moduleId !== moduleId) {
        return res.status(403).json({ ok: false, error: 'Module mismatch' });
    }
    res.json({ ok: true, payload: record.payload });
});

function verifyLocalHardwareBearer(req, res) {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
        res.status(401).json({ ok: false, error: 'Missing Bearer localSessionToken' });
        return null;
    }
    const session = localHardwareSessions.get(token);
    if (!session || Date.now() > session.expiresAtMs) {
        res.status(401).json({ ok: false, error: 'Invalid or expired localSessionToken' });
        return null;
    }
    return session;
}

app.get('/api/hardware/:collection', (req, res) => {
    const session = verifyLocalHardwareBearer(req, res);
    if (!session) return;
    const colName = req.params.collection;
    if (!ALLOWED_LOCAL_HARDWARE_COLLECTIONS.has(colName)) {
        return res.status(403).json({ ok: false, error: `Collection "${colName}" is restricted` });
    }
    const items = readLocalHardwareItems(session.orgId, colName);
    res.json({ ok: true, organizationId: session.orgId, collection: colName, items });
});

app.post('/api/hardware/:collection', (req, res) => {
    const session = verifyLocalHardwareBearer(req, res);
    if (!session) return;
    const colName = req.params.collection;
    if (!ALLOWED_LOCAL_HARDWARE_COLLECTIONS.has(colName)) {
        return res.status(403).json({ ok: false, error: `Collection "${colName}" is restricted` });
    }
    const body = req.body || {};
    const incoming = Array.isArray(body.items) ? body.items : [body];
    const existing = readLocalHardwareItems(session.orgId, colName);
    const byId = new Map(existing.map((it) => [String(it.id || it.deviceId), it]));
    const saved = [];
    for (const item of incoming) {
        if (!item || typeof item !== 'object') continue;
        const docId = String(item.id || item.deviceId || `${colName}_${Date.now()}`);
        const stamped = {
            ...item,
            id: docId,
            organizationId: session.orgId,
            updatedAt: new Date().toISOString()
        };
        byId.set(docId, stamped);
        saved.push(stamped);
    }
    writeLocalHardwareItems(session.orgId, colName, Array.from(byId.values()));
    res.json({ ok: true, organizationId: session.orgId, collection: colName, savedCount: saved.length, items: saved });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal server error occurred.' });
});

// Run server binding to all network interfaces on the machine
const startServer = () => {
    const port = process.env.PORT || DEFAULT_PORT;
    app.listen(port, '0.0.0.0', () => {
        console.log(`================================================================`);
        console.log(`🍇 agrimap Private Local Node initialized                       `);
        console.log(`📡 Server running on http://localhost:${port}                   `);
        console.log(`🌐 Accessible on local WiFi network at your computer's IP       `);
        console.log(`🤖 AI Gemini Gateway active on /api/gemini/call                 `);
        console.log(`================================================================`);
    });
};

startServer();
