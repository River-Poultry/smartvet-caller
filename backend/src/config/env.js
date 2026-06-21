const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '4600', 10);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  port,

  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  appUrl: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`,

  smartvetCoreApi: process.env.SMARTVET_CORE_API || 'https://smartvet.africa',
  smartvetCoreApiKey: process.env.SMARTVET_CORE_API_KEY || '',

  aiModelUrl: process.env.AI_MODEL_URL || '',
  aiModelKey: process.env.AI_MODEL_KEY || '',

  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID || '',
    apiKey: process.env.TWILIO_API_KEY || '',
    apiSecret: process.env.TWILIO_API_SECRET || '',
  },

  sms: {
    apiKey:   process.env.CARRIER_SMS_API_KEY || '',
    apiUrl:   process.env.CARRIER_SMS_URL     || 'https://api.mNotify.com/sms/quick',
    senderId: process.env.CARRIER_SMS_SENDER_ID || 'SmartVet',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

export function validateEnv() {
  const required = [
    ['DATABASE_URL', env.databaseUrl],
    ['JWT_SECRET', process.env.JWT_SECRET],
  ];

  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`[env] Missing required variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (env.isProduction && env.jwtSecret.startsWith('dev-')) {
    console.warn('[env] WARNING: Using development JWT secret in production');
  }
}
