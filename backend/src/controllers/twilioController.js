import twilio from 'twilio';
import twilioClient from '../config/twilio.js';
import { query, transaction } from '../config/db.js';
import { getFarmerByPhone } from '../services/smartvetCore.js';
import { requestTranscription, processTranscriptionCallback } from '../services/transcription.js';
import { notifyAgent, broadcast } from '../services/websocket.js';
import { logger } from '../config/logger.js';

const { twiml: { VoiceResponse } } = twilio;

// Find least-busy online agent
async function getLeastBusyAgent() {
  const { rows } = await query(
    `SELECT id, name FROM agents WHERE status = 'online' ORDER BY total_calls ASC LIMIT 1`
  );
  return rows[0] || null;
}

export async function handleInbound(req, res) {
  const { CallSid, From, To } = req.body;
  const response = new VoiceResponse();

  try {
    const farmer = await getFarmerByPhone(From);
    const agent = await getLeastBusyAgent();

    // Create call record
    const { rows } = await query(
      `INSERT INTO calls (twilio_call_sid, phone_number, farmer_id, farmer_name, agent_id, started_at, transcript_status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'pending') RETURNING id`,
      [CallSid, From, farmer?.id || null, farmer?.name || null, agent?.id || null]
    );
    const callId = rows[0].id;

    if (!agent) {
      response.say({ language: 'en-US' },
        'Thank you for calling SmartVet. All agents are currently busy. Please hold while we connect you.'
      );
      response.enqueue({ waitUrl: `${process.env.APP_URL}/api/twilio/wait-music` }, 'smartvet-queue');
    } else {
      // Mark agent on call
      await query(`UPDATE agents SET status = 'on_call', updated_at = NOW() WHERE id = $1`, [agent.id]);

      // Notify agent dashboard via WebSocket
      notifyAgent(agent.id, 'INBOUND_CALL', {
        callId,
        callSid: CallSid,
        callerPhone: From,
        farmer: farmer || { phone: From, name: 'Unknown Farmer' },
        is_unknown_farmer: !farmer,
      });

      response.say({ language: 'en-US' },
        'Thank you for calling SmartVet Africa. This call may be recorded for quality assurance. Connecting you now.'
      );

      const dial = response.dial({
        record: 'record-from-ringing',
        recordingStatusCallback: `${process.env.APP_URL}/api/twilio/recording-complete`,
        recordingStatusCallbackMethod: 'POST',
        action: `${process.env.APP_URL}/api/twilio/call-ended`,
      });

      // Use conference for better control
      dial.conference(`smartvet-call-${callId}`, {
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        waitUrl: `${process.env.APP_URL}/api/twilio/wait-music`,
      });
    }
  } catch (err) {
    logger.error('Inbound call handler failed', { CallSid, error: err.message });
    response.say('We are experiencing technical difficulties. Please try again shortly.');
  }

  res.type('text/xml').send(response.toString());
}

export async function handleCallEnded(req, res) {
  const { CallSid, CallDuration, RecordingUrl, RecordingSid } = req.body;
  const response = new VoiceResponse();

  try {
    const { rows } = await query(
      `UPDATE calls SET ended_at = NOW(), duration_seconds = $1, recording_url = $2, recording_sid = $3
       WHERE twilio_call_sid = $4 RETURNING id, agent_id`,
      [parseInt(CallDuration) || 0, RecordingUrl || null, RecordingSid || null, CallSid]
    );

    if (rows.length) {
      const { id: callId, agent_id: agentId } = rows[0];

      // Free up the agent
      if (agentId) {
        await query(
          `UPDATE agents SET status = 'online', total_calls = total_calls + 1, updated_at = NOW() WHERE id = $1`,
          [agentId]
        );
        notifyAgent(agentId, 'CALL_ENDED', { callId, callSid: CallSid });
      }

      broadcast('AGENT_STATUS_CHANGED', { agentId, status: 'online' });
    }
  } catch (err) {
    logger.error('Call ended handler failed', { CallSid, error: err.message });
  }

  res.type('text/xml').send(response.toString());
}

export async function handleRecordingComplete(req, res) {
  const { CallSid, RecordingSid, RecordingUrl } = req.body;

  try {
    await query(
      `UPDATE calls SET recording_url = $1, recording_sid = $2 WHERE twilio_call_sid = $3`,
      [RecordingUrl, RecordingSid, CallSid]
    );

    // Kick off async transcription
    await requestTranscription(CallSid, RecordingSid);
  } catch (err) {
    logger.error('Recording complete handler failed', err);
  }

  res.sendStatus(204);
}

export async function handleTranscriptionCallback(req, res) {
  const { CallSid } = req.body;
  // Twilio Intelligence sends transcript as JSON body
  const transcriptData = req.body.transcript || [];

  try {
    await processTranscriptionCallback(CallSid, transcriptData);
  } catch (err) {
    logger.error('Transcription callback failed', err);
  }

  res.sendStatus(204);
}

export function handleWaitMusic(req, res) {
  const response = new VoiceResponse();
  response.play({ loop: 10 }, 'https://com.twilio.music.classical.s3.amazonaws.com/ClockworkWaltz.mp3');
  res.type('text/xml').send(response.toString());
}

export async function getAgentToken(req, res) {
  try {
    const { AccessToken } = twilio.jwt;
    const { VoiceGrant } = AccessToken;

    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    });

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN,
      { identity: req.agent.id, ttl: 28800 }
    );
    token.addGrant(grant);

    res.json({ token: token.toJwt() });
  } catch (err) {
    logger.error('Agent token generation failed', err);
    res.status(500).json({ error: 'Could not generate voice token' });
  }
}
