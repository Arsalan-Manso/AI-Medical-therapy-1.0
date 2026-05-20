const buildLimiter = ({ windowMs, max, message }) => {
  const bucket = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const current = bucket.get(key);

    if (!current || now > current.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json(message);
    }

    current.count += 1;
    bucket.set(key, current);
    return next();
  };
};

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
});

const otpVerifyLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "Too many OTP verification attempts. Please try again later." },
});

module.exports = { authLimiter, otpVerifyLimiter };
