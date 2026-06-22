import 'dotenv/config';
import http from 'http';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initWebSocket } from './services/websocket.js';
import routes from './routes/index.js';
import { logger } from './config/logger.js';
import { validateEnv } from './config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

validateEnv();

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy; needed for rate-limiter IP detection
const server = http.createServer(app);

initWebSocket(server);

app.use(helmet());

// Serve hold audio and any future static assets
const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:5173',
  'https://smartvet-caller.vercel.app',
  ...( process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : [] ),
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow server-to-server / curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // allow any vercel preview/prod deployments for either project name
    if (/^https:\/\/smartvet-(?:caller|ai-callcenter)[-\w]*\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use('/api/twilio', express.urlencoded({ extended: false }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));
app.use('/api', routes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4600;
server.listen(PORT, () => {
  logger.info(`SmartVet Call Centre backend running on port ${PORT}`);
});
