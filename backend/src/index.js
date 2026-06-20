import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initWebSocket } from './services/websocket.js';
import routes from './routes/index.js';
import { logger } from './config/logger.js';

const app = express();
const server = http.createServer(app);

// WebSocket
initWebSocket(server);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}));

// Twilio webhooks need raw body for signature validation
app.use('/api/twilio', express.urlencoded({ extended: false }));

app.use(express.json({ limit: '2mb' }));

// Rate limiting
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4600;
server.listen(PORT, () => {
  logger.info(`SmartVet Call Centre backend running on port ${PORT}`);
});
