import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectPostgres } from './db';
import { router as participantRoutes } from './routes/participantRoutes';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ 
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [])
  ],
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(participantRoutes);

// routes
app.get('/', (_, res) => res.json({ 
  message: 'Knapsack Experiment API',
  version: '1.0.0',
  endpoints: {
    health: '/health',
    api: '/api/v1'
  }
}));

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(port, async () => {
  await connectPostgres();
  console.log(`[backend] running at http://localhost:${port}`);
});
