import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import ticketsRouter from './routes/tickets.js';
import paravetsRouter from './routes/paravets.js';
import dispatchRouter from './routes/dispatch.js';
import aiRouter from './routes/ai.js';
import recordingsRouter from './routes/recordings.js';
import callsRouter from './routes/calls.js';
import analyticsRouter from './routes/analytics.js';
import vetboardRouter from './routes/vetboard.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { requireAuth, requireRole, blockReadOnlyRoles } from './middleware/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => res.json({ name: 'SmartVet Call Center API', status: 'ok', docs: '/api/health' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);

app.use('/api/tickets', requireAuth, blockReadOnlyRoles, ticketsRouter);
app.use('/api/paravets', requireAuth, blockReadOnlyRoles, paravetsRouter);
app.use('/api/dispatch', requireAuth, blockReadOnlyRoles, dispatchRouter);
app.use('/api/ai', requireAuth, aiRouter);
app.use('/api/recordings', requireAuth, blockReadOnlyRoles, recordingsRouter);
app.use('/api/calls', requireAuth, blockReadOnlyRoles, callsRouter);
app.use('/api/users', requireAuth, requireRole('admin', 'super_admin'), usersRouter);
app.use('/api/analytics', requireAuth, requireRole('super_admin', 'admin'), analyticsRouter);
app.use('/api/vetboard', requireAuth, vetboardRouter);

app.listen(PORT, () => {
  console.log(`SmartVet Call Center API running on http://localhost:${PORT}`);
});
