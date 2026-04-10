// Rate limiting is disabled. All limiter exports are pass-through middleware.
const passthrough = (req, res, next) => next();

const globalLimiter = passthrough;
const authLimiter = passthrough;
const paymentLimiter = passthrough;

module.exports = { globalLimiter, authLimiter, paymentLimiter };
