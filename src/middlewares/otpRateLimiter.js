// src/middlewares/otpRateLimiter.js

const otpRequestStore = new Map();

/**
 * Ek phone number pe:
 * - 1 minute me sirf 1 OTP
 * - 24 hours me max 5 OTP
 */
export const otpRateLimiter = (req, res, next) => {
  const phone = req.body.phone?.trim();
  if (!phone) return next();

  const now = Date.now();
  const record = otpRequestStore.get(phone) || {
    lastSent: 0,
    dayCount: 0,
    dayStart: now,
  };

  // Reset daily counter after 24 hours
  if (now - record.dayStart > 24 * 60 * 60 * 1000) {
    record.dayCount = 0;
    record.dayStart = now;
  }

  // 1-minute cooldown
  if (now - record.lastSent < 60 * 1000) {
    const wait = Math.ceil((60 * 1000 - (now - record.lastSent)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${wait} seconds before requesting new OTP`,
    });
  }

  // 5 per day limit
  if (record.dayCount >= 5) {
    return res.status(429).json({
      success: false,
      message: "Daily OTP limit reached. Try again tomorrow.",
    });
  }

  record.lastSent = now;
  record.dayCount += 1;
  otpRequestStore.set(phone, record);

  next();
};