import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 }
});

/**
 * Authentication rate limiter
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts, please try again later.', code: 'AUTH_RATE_LIMIT_EXCEEDED', statusCode: 429 }
});
