import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        message: 'Too many requests, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
    },
});

/**
 * Authentication rate limiter
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        message: 'Too many login attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
    },
});

/**
 * Tighter limiter for interactive universal search traffic.
 */
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many search requests, please slow down.',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
    },
});
