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

// 3. Local Server AI Proxy & Status Gateway
app.get('/api/gemini/status', (req, res) => {
    const hasKey = !!(process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY);
    res.json({
        ok: true,
        hasServerKey: hasKey,
        service: 'AgriMap Local Server Node AI Gateway',
        nodeTime: new Date().toISOString()
    });
});

app.post('/api/gemini/test', async (req, res) => {
    const customKey = (req.headers['x-gemini-api-key']) || req.body?.customApiKey;
    const key = (customKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
    if (!key) {
        return res.json({
            success: false,
            ok: false,
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
        return res.json({
            success: testRes.ok,
            ok: testRes.ok,
            message: testRes.ok ? `Connection successful! Model responded: "${text.trim() || 'OK'}"` : (data.error?.message || 'Gemini test failed')
        });
    } catch (e) {
        return res.json({ success: false, ok: false, message: e.message });
    }
});

app.post('/api/gemini/call', async (req, res) => {
    const { contents, config, model } = req.body || {};
    const customKey = (req.headers['x-gemini-api-key']) || req.body?.customApiKey;
    const key = (customKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();

    if (!key) {
        return res.status(401).json({
            success: false,
            error: 'LOCAL_SERVER_GEMINI_KEY_MISSING',
            message: 'Local server does not have GEMINI_API_KEY and no key was provided in request header.'
        });
    }

    const targetModel = model || 'gemini-3.8-flash';

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
            return res.status(gRes.status).json({
                success: false,
                error: data.error?.message || 'Gemini upstream API returned error',
                details: data
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
        console.error('Local node Gemini proxy error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
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
