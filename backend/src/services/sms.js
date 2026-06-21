/**
 * SMS service — Message-Carrier Africa.
 *
 * API: POST https://messagecarrier.africa/v1/api-keys/send-sms
 * Auth: x-api-key header
 * Body: { phone, message }
 */
import { logger } from '../config/logger.js';

const API_URL = 'https://messagecarrier.africa/v1/api-keys/send-sms';
const API_KEY = process.env.CARRIER_SMS_API_KEY || '';

/**
 * Send a single SMS via Message-Carrier Africa.
 * @param {string} phone   — recipient phone e.g. +256700123456
 * @param {string} message — message body
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
export async function sendSms(phone, message) {
  if (!API_KEY) {
    logger.warn('[sms] CARRIER_SMS_API_KEY not set — SMS skipped');
    return { success: false, error: 'SMS not configured' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ phone, message }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      logger.error('[sms] Message-Carrier rejected request', { status: res.status, body });
      return { success: false, error: body.message || `HTTP ${res.status}` };
    }

    logger.info('[sms] Sent', { phone, messageId: body.id || body.message_id });
    return { success: true, messageId: body.id || body.message_id };
  } catch (err) {
    logger.error('[sms] Network error', { error: err.message });
    return { success: false, error: err.message };
  }
}
