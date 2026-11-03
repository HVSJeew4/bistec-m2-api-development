const { rateLimit } = require('express-rate-limit');
const AppError = require('../utils/AppError');
const config = require('../config');

// 100 requests per minute per client IP, for every route. Counters live in memory, which is
// fine for one server process (see README "Known Limitations").
const rateLimiter = rateLimit({
  ...config.rateLimit,
  standardHeaders: 'draft-7', // RateLimit + RateLimit-Policy headers; Retry-After when blocked
  legacyHeaders: false, // no X-RateLimit-* headers
  // Hand over to the central error handler so a 429 uses the same error envelope.
  handler: (_req, _res, next) => {
    next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later'));
  },
});

module.exports = rateLimiter;
