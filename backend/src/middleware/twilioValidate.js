import { validateTwilioSignature } from '../config/twilio.js';
import { logger } from '../config/logger.js';

export function twilioWebhook(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  if (!validateTwilioSignature(req)) {
    logger.warn('Invalid Twilio signature', { url: req.originalUrl, ip: req.ip });
    return res.status(403).send('Forbidden');
  }
  next();
}
