import { query } from '../config/db.js';
import { getAvailableParavets, createVetRequest } from '../services/smartvetCore.js';
import { notifyAgent, broadcast } from '../services/websocket.js';
import { logger } from '../config/logger.js';

export async function createDispatch(req, res) {
  const {
    call_id, farmer_id, farmer_name, farmer_phone,
    farm_id, farm_name, urgency_level, visit_type,
    symptoms_description, animal_type, animal_count,
    requested_date, requested_time_window,
    location_lat, location_lng, location_address,
  } = req.body;

  if (!farmer_id || !urgency_level) {
    return res.status(400).json({ error: 'farmer_id and urgency_level are required' });
  }

  let assignedParavet = null;
  let coreJobId = null;

  try {
    if (location_lat && location_lng) {
      const paravets = await getAvailableParavets({
        lat: location_lat,
        lng: location_lng,
        urgency: urgency_level,
      });
      assignedParavet = paravets?.[0] || null;
    }

    if (farm_id) {
      const coreJob = await createVetRequest(farm_id, {
        urgency: urgency_level,
        symptoms: symptoms_description,
        visit_type,
        requested_by: 'call_center_agent',
        call_id,
        agent_id: req.agent.id,
      });
      coreJobId = coreJob?.id || null;
    }
  } catch (err) {
    logger.warn('SmartVet core integration error during dispatch', err.message);
  }

  const { rows } = await query(
    `INSERT INTO vet_dispatch_requests (
      call_id, farmer_id, farmer_name, farmer_phone,
      farm_id, farm_name, urgency_level, visit_type,
      symptoms_description, animal_type, animal_count,
      requested_date, requested_time_window,
      assigned_paravet_id, assigned_paravet_name, assigned_paravet_phone,
      location_lat, location_lng, location_address,
      status, core_job_id, eta_minutes, agent_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    RETURNING *`,
    [
      call_id || null, farmer_id, farmer_name || null, farmer_phone || null,
      farm_id || null, farm_name || null, urgency_level, visit_type || null,
      symptoms_description || null, animal_type || null, animal_count || null,
      requested_date || null, requested_time_window || null,
      assignedParavet?.id || null, assignedParavet?.name || null, assignedParavet?.phone || null,
      location_lat || null, location_lng || null, location_address || null,
      assignedParavet ? 'assigned' : 'pending',
      coreJobId, assignedParavet?.eta_minutes || null, req.agent.id,
    ]
  );

  const dispatch = rows[0];

  broadcast('DISPATCH_CREATED', { dispatch });

  if (call_id) {
    await query(
      `UPDATE calls SET call_intent = 'vet_request', updated_at = NOW() WHERE id = $1`,
      [call_id]
    );
  }

  res.status(201).json({
    dispatch_id: dispatch.id,
    status: dispatch.status,
    paravet_assigned: assignedParavet
      ? { name: assignedParavet.name, phone: assignedParavet.phone, eta_minutes: assignedParavet.eta_minutes }
      : null,
    farmer_notified_via: dispatch.farmer_contact_sent ? dispatch.contact_method : null,
  });
}

export async function getDispatchStatus(req, res) {
  const { dispatchId } = req.params;

  const { rows } = await query(
    `SELECT * FROM vet_dispatch_requests WHERE id = $1`,
    [dispatchId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Dispatch not found' });
  res.json(rows[0]);
}

export async function updateDispatchStatus(req, res) {
  const { dispatchId } = req.params;
  const { status, assigned_paravet_id, assigned_paravet_name, assigned_paravet_phone, eta_minutes } = req.body;

  const { rows } = await query(
    `UPDATE vet_dispatch_requests
     SET status = COALESCE($1, status),
         assigned_paravet_id = COALESCE($2, assigned_paravet_id),
         assigned_paravet_name = COALESCE($3, assigned_paravet_name),
         assigned_paravet_phone = COALESCE($4, assigned_paravet_phone),
         eta_minutes = COALESCE($5, eta_minutes),
         updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [status, assigned_paravet_id, assigned_paravet_name, assigned_paravet_phone, eta_minutes, dispatchId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Dispatch not found' });

  broadcast('DISPATCH_UPDATED', { dispatch: rows[0] });
  res.json(rows[0]);
}

export async function listDispatches(req, res) {
  const { status, urgency, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (urgency) { params.push(urgency); conditions.push(`urgency_level = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);

  const { rows } = await query(
    `SELECT * FROM vet_dispatch_requests ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ dispatches: rows, page: parseInt(page), limit: parseInt(limit) });
}

export async function escalateDispatch(req, res) {
  const { dispatchId } = req.params;
  const { escalation_level, escalation_notes } = req.body;

  const { rows } = await query(
    `UPDATE vet_dispatch_requests
     SET escalation_level = $1,
         escalation_notes = $2,
         escalated_at = NOW(),
         updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [escalation_level, escalation_notes || '', dispatchId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Dispatch not found' });
  broadcast('DISPATCH_ESCALATED', { dispatch: rows[0] });
  res.json(rows[0]);
}

export async function resolveDispatch(req, res) {
  const { dispatchId } = req.params;
  const { agent_notes, outcome } = req.body;

  const { rows } = await query(
    `UPDATE vet_dispatch_requests
     SET status = 'completed',
         resolved_at = NOW(),
         agent_notes = COALESCE($1, agent_notes),
         updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [agent_notes, dispatchId]
  );

  if (!rows.length) return res.status(404).json({ error: 'Dispatch not found' });
  broadcast('DISPATCH_RESOLVED', { dispatch: rows[0] });
  res.json(rows[0]);
}
