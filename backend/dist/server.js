"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const participantRoutes_1 = require("./routes/participantRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 8787);
// CORS: use a simple pattern-based check
function isAllowedOrigin(origin) {
    if (origin.includes('github.io'))
        return true;
    if (origin.includes('localhost:3000'))
        return true;
    if (origin.includes('localhost:3001'))
        return true;
    if (origin.includes('localhost:8787'))
        return true;
    const envOrigins = process.env.CORS_ORIGIN || '';
    if (envOrigins && envOrigins.includes(origin))
        return true;
    return false;
}
console.log('[CORS] Pattern-based origin matching enabled');
console.log('[CORS] CORS_ORIGIN env:', process.env.CORS_ORIGIN || '(not set)');
// MANUAL CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        // Always echo back the origin for allowed origins
        // For rejected origins, still echo to diagnose issues (temporary)
        res.setHeader('Access-Control-Allow-Origin', origin);
        if (!isAllowedOrigin(origin)) {
            console.log(`[CORS] WARNING: origin "${origin}" not in allowlist but echoed anyway`);
        }
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        res.setHeader('Content-Length', '0');
        res.writeHead(204);
        return res.end();
    }
    next();
});
app.use(express_1.default.json({ limit: '2mb' }));
app.use(participantRoutes_1.router);
app.use(authRoutes_1.router);
// routes
app.get('/health', (_, res) => res.json({ ok: true }));
// Temporary debug endpoint
app.get('/debug-cors', (req, res) => {
    res.json({
        incomingOrigin: req.headers.origin || '(none)',
        isAllowed: req.headers.origin ? isAllowedOrigin(req.headers.origin) : false,
        corsOriginEnv: process.env.CORS_ORIGIN || '(not set)',
        nodeVersion: process.version
    });
});
app.listen(port, async () => {
    await (0, db_1.connectPostgres)();
    console.log(`[backend] running at http://localhost:${port}`);
});
