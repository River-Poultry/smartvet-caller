import twilio from 'twilio';
import { query } from '../config/db.js';
import { generateSuggestions } from '../services/aiSuggestions.js';
import { logger } from '../config/logger.js';

function twilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function getActiveCall(req, res) {
  const agentId = req.params.agentId || req.agent.id;

  const { rows } = await query(
    `SELECT c.*,
       json_agg(ct.* ORDER BY ct.timestamp_offset_seconds) FILTER (WHERE ct.id IS NOT NULL) as transcript_segments
     FROM calls c
     LEFT JOIN call_transcripts ct ON ct.call_id = c.id
     WHERE c.agent_id = $1 AND c.ended_at IS NULL
     GROUP BY c.id
     ORDER BY c.started_at DESC
     LIMIT 1`,
    [agentId]
  );

  if (!rows.length) return res.json({ call_id: null });

  const call = rows[0];
  res.json({
    call_id: call.id,
    twilio_call_sid: call.twilio_call_sid,
    farmer: {
      id: call.farmer_id,
      name: call.farmer_name,
      phone: call.phone_number,
    },
    call_timer_seconds: call.started_at
      ? Math.floor((Date.now() - new Date(call.started_at)) / 1000)
      : 0,
    recording_active: !!call.twilio_call_sid,
    transcript_segments: call.transcript_segments || [],
    is_emergency: call.is_emergency,
  });
}

export async function getCallSuggestions(req, res) {
  const { callId } = req.params;

  const { rows } = await query(
    `SELECT * FROM ai_suggestions WHERE call_id = $1 ORDER BY generated_at DESC`,
    [callId]
  );

  res.json({ suggestions: rows });
}

export async function submitPostCall(req, res) {
  const { callId } = req.params;
  const { agent_notes, outcome, next_steps } = req.body;

  const { rows } = await query(
    `UPDATE calls SET agent_notes = $1, outcome = $2, next_steps = $3, updated_at = NOW()
     WHERE id = $4 AND agent_id = $5 RETURNING id`,
    [agent_notes, outcome, next_steps, callId, req.agent.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Call not found' });
  res.json({ message: 'Post-call notes saved', callId });
}

export async function listCalls(req, res) {
  const { page = 1, limit = 20, outcome, emergency, agentId, from, to } = req.query;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (!req.agent.is_admin) {
    params.push(req.agent.id);
    conditions.push(`c.agent_id = $${params.length}`);
  } else if (agentId) {
    params.push(agentId);
    conditions.push(`c.agent_id = $${params.length}`);
  }

  if (outcome) { params.push(outcome); conditions.push(`c.outcome = $${params.length}`); }
  if (emergency === 'true') conditions.push(`c.is_emergency = true`);
  if (from) { params.push(from); conditions.push(`c.started_at >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`c.started_at <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(parseInt(limit), offset);
  const { rows } = await query(
    `SELECT c.*, a.name as agent_name,
       (SELECT count(*) FROM vet_dispatch_requests d WHERE d.call_id = c.id) as dispatch_count
     FROM calls c LEFT JOIN agents a ON a.id = c.agent_id
     ${where} ORDER BY c.started_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await query(
    `SELECT count(*) FROM calls c ${where}`,
    params.slice(0, -2)
  );

  res.json({ calls: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
}

export async function getCallDetail(req, res) {
  const { callId } = req.params;

  const [callRes, transcriptRes, suggestionsRes, dispatchRes] = await Promise.all([
    query(`SELECT c.*, a.name as agent_name FROM calls c LEFT JOIN agents a ON a.id = c.agent_id WHERE c.id = $1`, [callId]),
    query(`SELECT * FROM call_transcripts WHERE call_id = $1 ORDER BY timestamp_offset_seconds`, [callId]),
    query(`SELECT * FROM ai_suggestions WHERE call_id = $1 ORDER BY generated_at`, [callId]),
    query(`SELECT * FROM vet_dispatch_requests WHERE call_id = $1`, [callId]),
  ]);

  if (!callRes.rows.length) return res.status(404).json({ error: 'Call not found' });

  if (!req.agent.is_admin && callRes.rows[0].agent_id !== req.agent.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    call: callRes.rows[0],
    transcript: transcriptRes.rows,
    suggestions: suggestionsRes.rows,
    dispatches: dispatchRes.rows,
  });
}

export async function triggerSuggestions(req, res) {
  const { callId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const suggestions = await generateSuggestions(callId, text);
  res.json({ suggestions });
}

export async function startDemoCall(req, res) {
  await query(
    `UPDATE calls SET ended_at = NOW() WHERE agent_id = $1 AND ended_at IS NULL AND twilio_call_sid LIKE 'DEMO-%'`,
    [req.agent.id]
  );

  const farmerId = req.body.farmer_id || null;
  let farmerName = 'Demo Farmer';
  let farmerPhone = '+256700000000';

  if (farmerId) {
    const fr = await query('SELECT full_name, phone FROM farmers WHERE id = $1', [farmerId]);
    if (fr.rows[0]) { farmerName = fr.rows[0].full_name; farmerPhone = fr.rows[0].phone; }
  }

  const { rows } = await query(
    `INSERT INTO calls (agent_id, twilio_call_sid, phone_number, farmer_id, farmer_name, started_at)
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [req.agent.id, `DEMO-${Date.now()}`, farmerPhone, farmerId, farmerName]
  );

  const call = rows[0];
  res.json({
    call_id: call.id,
    twilio_call_sid: call.twilio_call_sid,
    farmer: { id: call.farmer_id, name: call.farmer_name, phone: call.phone_number },
    call_timer_seconds: 0,
    recording_active: false,
    is_emergency: false,
    is_demo: true,
  });
}

export async function toggleMute(req, res) {
  const { callId } = req.params;
  const { muted } = req.body;

  const { rows } = await query(
    `SELECT twilio_call_sid FROM calls WHERE id = $1 AND agent_id = $2 AND ended_at IS NULL`,
    [callId, req.agent.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Active call not found' });

  const callSid = rows[0].twilio_call_sid;
  if (!callSid || callSid.startsWith('DEMO-')) {
    return res.json({ muted: !!muted, demo: true });
  }

  try {
    const conferenceName = `smartvet-call-${callId}`;
    const conferences = await twilioClient().conferences.list({ friendlyName: conferenceName, status: 'in-progress', limit: 1 });

    if (conferences.length) {
      const participants = await conferences[0].participants().list({ limit: 10 });
      const farmer = participants.find(p => p.callSid === callSid) || participants[0];
      if (farmer) await farmer.update({ muted: !!muted });
    }

    res.json({ muted: !!muted });
  } catch (err) {
    logger.warn('Mute toggle failed', { callId, error: err.message });
    res.json({ muted: !!muted, warning: 'Call control unavailable' });
  }
}

export async function toggleHold(req, res) {
  const { callId } = req.params;
  const { hold } = req.body;

  const { rows } = await query(
    `SELECT twilio_call_sid FROM calls WHERE id = $1 AND agent_id = $2 AND ended_at IS NULL`,
    [callId, req.agent.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Active call not found' });

  const callSid = rows[0].twilio_call_sid;
  if (!callSid || callSid.startsWith('DEMO-')) {
    return res.json({ hold: !!hold, demo: true });
  }

  try {
    const conferenceName = `smartvet-call-${callId}`;
    const conferences = await twilioClient().conferences.list({ friendlyName: conferenceName, status: 'in-progress', limit: 1 });

    if (conferences.length) {
      const participants = await conferences[0].participants().list({ limit: 10 });
      const farmer = participants.find(p => p.callSid === callSid) || participants[0];
      if (farmer) {
        await farmer.update({
          hold: !!hold,
          holdUrl: hold
            ? `${process.env.APP_URL}/api/twilio/wait-music`
            : undefined,
        });
      }
    }

    res.json({ hold: !!hold });
  } catch (err) {
    logger.warn('Hold toggle failed', { callId, error: err.message });
    res.json({ hold: !!hold, warning: 'Call control unavailable' });
  }
}

export async function endDemoCall(req, res) {
  await query(
    `UPDATE calls SET ended_at = NOW()
     WHERE agent_id = $1 AND ended_at IS NULL AND twilio_call_sid LIKE 'DEMO-%'`,
    [req.agent.id]
  );
  res.json({ ended: true });
}
