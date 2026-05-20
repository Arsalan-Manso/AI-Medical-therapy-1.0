const express = require("express");
const {
  signup,
  verifySignupOtp,
  login,
  verifyLoginOtp,
  resendOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  googleAuth,
  me,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter, otpVerifyLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/register", authLimiter, signup);
router.post("/register/verify-otp", otpVerifyLimiter, verifySignupOtp);
router.post("/login", authLimiter, login);
router.post("/login/verify-otp", otpVerifyLimiter, verifyLoginOtp);
router.post("/otp/resend", authLimiter, resendOtp);
router.post("/password/forgot", authLimiter, requestPasswordResetOtp);
router.post("/password/reset", otpVerifyLimiter, resetPasswordWithOtp);
router.post("/google", authLimiter, googleAuth);
router.get("/me", protect, me);

module.exports = router;
