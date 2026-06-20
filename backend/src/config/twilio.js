import twilio from 'twilio';

export function validateTwilioSignature(req) {
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${process.env.APP_URL}${req.originalUrl}`;
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );
}
