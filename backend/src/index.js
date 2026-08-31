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
  'http://localhost:3000',
  'https://smartvet-caller.vercel.app',
  'https://callcenter.smartvet.africa',
  'https://smartvet.africa',
  ...( process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : [] ),
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow server-to-server / curl / mobile apps
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // allow any localhost / 127.0.0.1 port
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    // allow all *.smartvet.africa domains
    if (/^https:\/\/([a-zA-Z0-9-]+\.)*smartvet\.africa$/.test(origin)) return cb(null, true);
    // allow all Vercel deployments (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(null, true); // Permissive CORS for deployed client apps
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

  // Keep-alive: ping own health endpoint every 8 minutes to prevent Render free-tier spin-down
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://smartvet-callcenter-api.onrender.com';
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    setInterval(async () => {
      try {
        const res = await fetch(`${SELF_URL}/health`);
        logger.info(`[keep-alive] ping ${res.status}`);
      } catch (err) {
        logger.warn(`[keep-alive] ping failed: ${err.message}`);
      }
    }, 8 * 60 * 1000); // every 8 minutes
    logger.info(`[keep-alive] started — pinging ${SELF_URL}/health every 8 min`);
  }
});
