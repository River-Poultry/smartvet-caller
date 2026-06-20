import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { broadcast } from '../services/websocket.js';

export async function listAgents(req, res) {
  const { rows } = await query(
    `SELECT id, name, email, phone_number, status, is_admin, total_calls, avg_call_duration_seconds, created_at
     FROM agents ORDER BY name`
  );
  res.json(rows);
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  const validStatuses = ['online', 'on_break', 'offline'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const { rows } = await query(
    `UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
    [status, req.agent.id]
  );

  broadcast('AGENT_STATUS_CHANGED', { agentId: req.agent.id, status });
  res.json(rows[0]);
}

export async function createAgent(req, res) {
  const { name, email, password, phone_number, is_admin = false } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO agents (name, email, password_hash, phone_number, is_admin)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, status, is_admin`,
    [name, email, hash, phone_number || null, is_admin]
  );

  res.status(201).json(rows[0]);
}

export async function updateAgent(req, res) {
  const { agentId } = req.params;
  const { name, phone_number, is_admin } = req.body;

  const { rows } = await query(
    `UPDATE agents SET
       name = COALESCE($1, name),
       phone_number = COALESCE($2, phone_number),
       is_admin = COALESCE($3, is_admin),
       updated_at = NOW()
     WHERE id = $4 RETURNING id, name, email, phone_number, status, is_admin`,
    [name, phone_number, is_admin, agentId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Agent not found' });
  res.json(rows[0]);
}

export async function getMetrics(req, res) {
  const [agentRows, callRows, dispatchRows] = await Promise.all([
    query(`SELECT status, count(*) FROM agents GROUP BY status`),
    query(`
      SELECT
        count(*) FILTER (WHERE started_at::date = CURRENT_DATE) as calls_today,
        count(*) FILTER (WHERE started_at::date = CURRENT_DATE AND is_emergency) as emergencies_today,
        round(avg(duration_seconds) FILTER (WHERE duration_seconds > 0)) as avg_duration,
        count(*) FILTER (WHERE ended_at IS NULL) as active_calls
      FROM calls
    `),
    query(`
      SELECT
        count(*) FILTER (WHERE status = 'pending') as pending,
        count(*) FILTER (WHERE status = 'assigned') as assigned,
        count(*) FILTER (WHERE status = 'completed' AND created_at::date = CURRENT_DATE) as completed_today
      FROM vet_dispatch_requests
    `),
  ]);

  const agentsByStatus = {};
  for (const r of agentRows.rows) agentsByStatus[r.status] = parseInt(r.count);

  res.json({
    agents: agentsByStatus,
    calls: callRows.rows[0],
    dispatches: dispatchRows.rows[0],
  });
}
