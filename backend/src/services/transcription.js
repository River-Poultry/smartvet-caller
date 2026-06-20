import twilioClient from '../config/twilio.js';
import { query } from '../config/db.js';
import { generateSuggestions } from './aiSuggestions.js';
import { logger } from '../config/logger.js';

export async function requestTranscription(callSid, recordingSid) {
  try {
    // Enable Twilio Intelligence transcription on the recording
    await twilioClient.intelligence.v2.transcripts.create({
      channel: {
        media_properties: {
          source_sid: recordingSid,
        },
      },
    });
    logger.info('Transcription requested', { callSid, recordingSid });
  } catch (err) {
    // Twilio Intelligence may not be on the account; log and continue
    logger.warn('Transcription request failed (Twilio Intelligence)', { error: err.message });
    await query(
      `UPDATE calls SET transcript_status = 'failed' WHERE twilio_call_sid = $1`,
      [callSid]
    );
  }
}

export async function processTranscriptionCallback(callSid, transcriptData) {
  try {
    const { rows } = await query(
      'SELECT id FROM calls WHERE twilio_call_sid = $1',
      [callSid]
    );
    if (!rows.length) return;
    const callId = rows[0].id;

    const segments = Array.isArray(transcriptData) ? transcriptData : [];
    const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

    // Store full transcript text
    await query(
      `UPDATE calls SET transcript_text = $1, transcript_status = 'completed' WHERE id = $2`,
      [fullText, callId]
    );

    // Store individual segments
    for (const seg of segments) {
      await query(
        `INSERT INTO call_transcripts (call_id, timestamp_offset_seconds, speaker, text, confidence_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [callId, seg.timestamp ?? null, seg.speaker ?? 'farmer', seg.text, seg.confidence ?? null]
      );
    }

    // Generate AI suggestions from full transcript
    await generateSuggestions(callId, fullText);

    logger.info('Transcription processed', { callId, segments: segments.length });
  } catch (err) {
    logger.error('Transcription processing failed', { callSid, error: err.message });
  }
}
