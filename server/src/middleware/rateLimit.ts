import { rateLimit } from 'express-rate-limit';

// Stricter than the global limiter: registration and login are the
// brute-force / credential-stuffing surface. Baseline values — a production
// deployment would add account lockout and/or CAPTCHA on top.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts, please try again later',
      },
    });
  },
});
