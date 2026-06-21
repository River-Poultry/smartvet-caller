/**
 * SMS service — carrier-agnostic wrapper.
 *
 * Set CARRIER_SMS_URL and CARRIER_SMS_API_KEY in env.
 * Default format: POST JSON { to, message, sender_id }
 * with Bearer token auth — works with most African SMS gateways
 * that use the mc_live_* key format.
 */
import { logger } from '../config/logger.js';

const CARRIER_URL  = process.env.CARRIER_SMS_URL  || 'https://api.mNotify.com/sms/quick';
const CARRIER_KEY  = process.env.CARRIER_SMS_API_KEY || '';
const SENDER_ID    = process.env.CARRIER_SMS_SENDER_ID || 'SmartVet';

/**
 * Send a single SMS.
 * @param {string} to      — recipient phone in E.164 format e.g. +256700123456
 * @param {string} message — message body (max 160 chars for single SMS)
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
export async function sendSms(to, message) {
  if (!CARRIER_KEY) {
    logger.warn('[sms] CARRIER_SMS_API_KEY not set — SMS skipped');
    return { success: false, error: 'SMS not configured' };
  }

  try {
    const res = await fetch(CARRIER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CARRIER_KEY}`,
      },
      body: JSON.stringify({
        recipient: to,
        sender:    SENDER_ID,
        message,
        // some providers use 'to' instead of 'recipient'
        to,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      logger.error('[sms] Carrier rejected request', { status: res.status, body });
      return { success: false, error: body.message || `HTTP ${res.status}` };
    }

    logger.info('[sms] Sent', { to, messageId: body.id || body.message_id });
    return { success: true, messageId: body.id || body.message_id };
  } catch (err) {
    logger.error('[sms] Network error', { error: err.message });
    return { success: false, error: err.message };
  }
}
