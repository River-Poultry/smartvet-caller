import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 5 minutes and try again.' },
  skipSuccessfulRequests: true,
});
