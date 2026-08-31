import 'dotenv/config';
import express from 'express';
import { connectPostgres } from './db';
import { router as participantRoutes } from './routes/participantRoutes';
import { router as authRoutes } from './routes/authRoutes';

const app = express();
const port = Number(process.env.PORT || 8787);

// CORS: use a simple pattern-based check
function isAllowedOrigin(origin: string): boolean {
  if (origin.includes('github.io')) return true;
  if (origin.includes('localhost:3000')) return true;
  if (origin.includes('localhost:3001')) return true;
  if (origin.includes('localhost:8787')) return true;
  const envOrigins = process.env.CORS_ORIGIN || '';
  if (envOrigins && envOrigins.includes(origin)) return true;
  return false;
}

console.log('[CORS] Pattern-based origin matching enabled');
console.log('[CORS] CORS_ORIGIN env:', process.env.CORS_ORIGIN || '(not set)');

// MANUAL CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

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

app.use(express.json({ limit: '2mb' }));
app.use(participantRoutes);
app.use(authRoutes);

// routes
app.get('/health', (_, res) => res.json({ ok: true }));

// Temporary debug endpoint
app.get('/debug-cors', (req, res) => {
  res.json({
    incomingOrigin: req.headers.origin || '(none)',
    isAllowed: req.headers.origin ? isAllowedOrigin(req.headers.origin as string) : false,
    corsOriginEnv: process.env.CORS_ORIGIN || '(not set)',
    nodeVersion: process.version
  });
});

app.listen(port, async () => {
  await connectPostgres();
  console.log(`[backend] running at http://localhost:${port}`);
});
