/**
 * Outreach controller — agent-initiated callbacks and SMS to farmers.
 *
 * Callback flow:
 *   1. Agent clicks "Call back" → POST /api/outreach/callback
 *   2. Twilio REST API dials the farmer
 *   3. On answer Twilio hits /api/twilio/callback-answer (TwiML webhook)
 *   4. TwiML places farmer in a named conference room
 *   5. WebSocket notifies agent with the conference name so their
 *      Twilio Device can join the same room
 */
import twilio from 'twilio';
import { query } from '../db/index.js';
import { sendSms } from '../services/sms.js';
import { notifyAgent } from '../services/websocket.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

function twilioClient() {
  return twilio(env.twilio.accountSid, env.twilio.authToken);
}

// ── Initiate outbound callback ────────────────────────────────────────────────

export async function initiateCallback(req, res) {
  const { farmer_id, farmer_phone, farmer_name } = req.body;

  if (!farmer_phone) {
    return res.status(400).json({ error: 'farmer_phone is required' });
  }
  if (!env.twilio.accountSid || !env.twilio.phoneNumber) {
    return res.status(503).json({ error: 'Twilio not configured' });
  }

  try {
    // Create a call record before dialling so we have an ID for the conference
    const { rows } = await query(
      `INSERT INTO calls
         (agent_id, phone_number, farmer_id, farmer_name, started_at, call_intent)
       VALUES ($1, $2, $3, $4, NOW(), 'callback')
       RETURNING id`,
      [req.agent.id, farmer_phone, farmer_id || null, farmer_name || 'Unknown']
    );
    const callId = rows[0].id;
    const conferenceName = `sv-callback-${callId}`;

    // Dial farmer via Twilio REST — when they answer, hit our webhook
    const call = await twilioClient().calls.create({
      to:   farmer_phone,
      from: env.twilio.phoneNumber,
      url:  `${env.appUrl}/api/twilio/callback-answer?callId=${callId}&agentId=${req.agent.id}`,
      statusCallback: `${env.appUrl}/api/twilio/call-ended`,
      statusCallbackMethod: 'POST',
    });

    // Store Twilio SID
    await query(
      `UPDATE calls SET twilio_call_sid = $1 WHERE id = $2`,
      [call.sid, callId]
    );

    // Tell the agent's browser to join the conference with their Twilio Device
    notifyAgent(req.agent.id, 'OUTBOUND_CALL_STARTED', {
      callId,
      callSid: call.sid,
      conferenceName,
      farmerPhone: farmer_phone,
      farmer: { id: farmer_id, name: farmer_name, phone: farmer_phone },
    });

    res.json({ callId, callSid: call.sid, conferenceName });
  } catch (err) {
    logger.error('[outreach] Callback initiation failed', { error: err.message });
    res.status(500).json({ error: 'Failed to initiate call', detail: err.message });
  }
}

// ── Send SMS to farmer ────────────────────────────────────────────────────────

export async function sendFarmerSms(req, res) {
  const { farmer_phone, farmer_name, message, call_id } = req.body;

  if (!farmer_phone || !message) {
    return res.status(400).json({ error: 'farmer_phone and message are required' });
  }
  if (message.length > 480) {
    return res.status(400).json({ error: 'Message too long (max 480 chars / 3 SMS parts)' });
  }

  const result = await sendSms(farmer_phone, message);

  if (!result.success) {
    return res.status(502).json({ error: result.error || 'SMS delivery failed' });
  }

  // Log SMS against the call record if provided
  if (call_id) {
    await query(
      `UPDATE calls
       SET agent_notes = COALESCE(agent_notes, '') || $1, updated_at = NOW()
       WHERE id = $2 AND agent_id = $3`,
      [`\n[SMS sent to ${farmer_name || farmer_phone}]: ${message}`, call_id, req.agent.id]
    ).catch(() => {});
  }

  logger.info('[outreach] SMS sent', { to: farmer_phone, agentId: req.agent.id, messageId: result.messageId });
  res.json({ sent: true, messageId: result.messageId });
}
