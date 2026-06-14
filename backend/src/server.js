import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import ticketsRouter from './routes/tickets.js';
import paravetsRouter from './routes/paravets.js';
import knowledgebaseRouter from './routes/knowledgebase.js';
import dispatchRouter from './routes/dispatch.js';
import aiRouter from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ name: 'SmartVet Call Center API', status: 'ok', docs: '/api/health' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/tickets', ticketsRouter);
app.use('/api/paravets', paravetsRouter);
app.use('/api/knowledge', knowledgebaseRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
  console.log(`SmartVet Call Center API running on http://localhost:${PORT}`);
});
