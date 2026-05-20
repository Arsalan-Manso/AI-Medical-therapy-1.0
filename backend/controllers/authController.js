const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const { publicDoctorUser } = require("./doctorRegisterController");
const { sendMail } = require("../services/emailService");
const {
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
} = require("../utils/authValidation");

const allowedTypes = ["Admin", "Doctor", "Patient", "Pharmacy"];
const otpValidityMs = 10 * 60 * 1000;
const otpResendCooldownMs = 60 * 1000;
const otpMaxAttempts = 5;
const ADMIN_EMAIL = "aimedicaltherapy@gmail.com";
const ADMIN_PASSWORD = "Aimedical2480@.";

const isPlaceholder = (value) =>
  !value || String(value).includes("your_") || String(value).includes("_here");

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const createToken = (userId, type) =>
  jwt.sign({ userId, type }, process.env.JWT_SECRET, { expiresIn: "7d" });

const userPayloadFor = (user) =>
  user.type === "Doctor"
    ? publicDoctorUser(user)
    : {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
      };

const buildOtpEmailHtml = ({ otpCode, purpose }) => {
  const title = purpose === "signup" ? "Verify Your Email Address" : "Your Secure Login Code";
  const intro =
    purpose === "signup"
      ? "Thank you for signing up with <b>AI Medical Therapy</b>. To complete your registration, please use the verification code below."
      : "Use the verification code below to securely complete your login to <b>AI Medical Therapy</b>.";
  const logoUrl = process.env.MAIL_LOGO_URL || "";
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="AI Medical Therapy" style="height:44px; margin-bottom:10px;" />`
    : "";

  return `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #eaeaea;">
      <div style="background:#1f4e79; padding:22px; text-align:center;">
        ${logoBlock}
        <h1 style="color:#ffffff; margin:0; font-size:20px; letter-spacing:0.5px;">AI Medical Therapy</h1>
      </div>
      <div style="padding:30px; color:#333333;">
        <h2 style="margin-top:0; font-size:18px; color:#1f4e79;">${title}</h2>
        <p style="font-size:14px; line-height:1.7;">${intro}</p>
        <div style="margin:25px 0; text-align:center;">
          <div style="display:inline-block; padding:14px 28px; font-size:26px; letter-spacing:6px; font-weight:bold; background:#f0f4ff; border:1px solid #1f4e79; border-radius:8px; color:#1f4e79;">
            ${otpCode}
          </div>
        </div>
        <p style="font-size:14px; line-height:1.7;">
          This code is valid for <b>10 minutes</b>. For your security, please do not share it with anyone.
        </p>
        <p style="font-size:13px; color:#666; line-height:1.6;">
          If you did not request this verification, you can safely ignore this email.
        </p>
      </div>
      <div style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} AI Medical Therapy. All rights reserved.
      </div>
    </div>
  </div>
`;
};


// ================= OTP CORE =================

const issueAndSendOtp = async (user, purpose = "login") => {
  if (user.otpResendAfter && user.otpResendAfter.getTime() > Date.now()) {
    const secondsLeft = Math.ceil(
      (user.otpResendAfter.getTime() - Date.now()) / 1000
    );
    throw new Error(`Please wait ${secondsLeft}s before requesting another OTP.`);
  }

  const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
  const otpCodeHash = crypto.createHash("sha256").update(otpCode).digest("hex");

  user.otpCodeHash = otpCodeHash;
  user.otpExpiresAt = new Date(Date.now() + otpValidityMs);
  user.otpPurpose = purpose;
  user.otpAttempts = 0;
  user.otpResendAfter = new Date(Date.now() + otpResendCooldownMs);

  await user.save();

  await sendMail({
    to: user.email,
    subject:
      purpose === "signup"
        ? "AI Medical Therapy - Email Verification OTP"
        : "AI Medical Therapy - Login OTP",
    text: `Your OTP is ${otpCode}. It expires in 10 minutes.`,
    html: buildOtpEmailHtml({ otpCode, purpose }),
  });

  return true;
};


// ================= SIGNUP =================

const signup = async (req, res) => {
  try {
    const { name, email, password, type } = req.body;

    if (!name || !email || !password || !type) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }
    if (type === "Admin") {
      return res.status(403).json({ message: "Admin account cannot be self-registered." });
    }

    if (!validateName(name)) {
      return res.status(400).json({
        message: "Name must contain letters only.",
      });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email." });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Use 8+ characters with upper, lower, and number.",
      });
    }

    const emailNorm = normalizeEmail(email);
    const [existingUser, pending] = await Promise.all([
      User.findOne({ email: emailNorm }),
      PendingSignup.findOne({ email: emailNorm }),
    ]);
    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const pendingSignup =
      pending ||
      (await PendingSignup.create({
        name: String(name).trim(),
        email: emailNorm,
        password: hashedPassword,
        type,
      }));
    pendingSignup.name = String(name).trim();
    pendingSignup.password = hashedPassword;
    pendingSignup.type = type;
    await issueAndSendOtp(pendingSignup, "signup");

    return res.status(201).json({
      message: "Signup created. OTP sent.",
      otpRequired: true,
      email: pendingSignup.email,
      type: pendingSignup.type,
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= LOGIN =================

const login = async (req, res) => {
  try {
    const { email, password, type } = req.body;

    const emailNorm = normalizeEmail(email);

    let user = await User.findOne({ email: emailNorm });

    if (type === "Admin") {
      if (emailNorm !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(400).json({ message: "Invalid admin credentials." });
      }
      if (!user) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        user = await User.create({
          name: "AI Medical Therapy Admin",
          email: ADMIN_EMAIL,
          password: hash,
          type: "Admin",
          isEmailVerified: true,
        });
      } else if (user.type !== "Admin") {
        return res.status(403).json({ message: "Email belongs to another account type." });
      } else {
        const adminPasswordMatch = await bcrypt.compare(ADMIN_PASSWORD, user.password || "");
        if (!adminPasswordMatch) {
          user.password = await bcrypt.hash(ADMIN_PASSWORD, 10);
          await user.save();
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: "Email does not exist." });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Use Google login for this account.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.type !== type) {
      return res.status(403).json({ message: "Wrong account type" });
    }

    if (!user.isEmailVerified) {
      await issueAndSendOtp(user, "signup");

      return res.status(403).json({
        message: "Email not verified. OTP sent.",
        otpRequired: true,
      });
    }

    await issueAndSendOtp(user, "login");

    return res.status(200).json({
      message: "OTP sent.",
      otpRequired: true,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= RESEND OTP =================

const resendOtp = async (req, res) => {
  try {
    const { email, type, purpose } = req.body;
    const targetPurpose = purpose || "login";

    if (targetPurpose === "signup") {
      const pending = await PendingSignup.findOne({ email: normalizeEmail(email) });
      if (pending) {
        if (type && pending.type !== type) {
          return res.status(400).json({ message: "Invalid account type." });
        }
        await issueAndSendOtp(pending, "signup");
        return res.status(200).json({ message: "OTP resent." });
      }
      const unverifiedUser = await User.findOne({ email: normalizeEmail(email) });
      if (unverifiedUser && !unverifiedUser.isEmailVerified) {
        if (type && unverifiedUser.type !== type) {
          return res.status(400).json({ message: "Invalid account type." });
        }
        await issueAndSendOtp(unverifiedUser, "signup");
        return res.status(200).json({ message: "OTP resent." });
      }
      return res.status(404).json({ message: "No pending signup found." });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (type && user.type !== type) {
      return res.status(400).json({ message: "Invalid account type." });
    }

    await issueAndSendOtp(user, "login");

    return res.status(200).json({ message: "OTP resent." });
  } catch (error) {
    console.error("RESEND OTP ERROR:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

const requestPasswordResetOtp = async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) {
      return res.status(400).json({ message: "Email and portal are required." });
    }
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || user.type !== type) {
      return res.status(404).json({ message: "Account not found." });
    }
    await issueAndSendOtp(user, "reset_password");
    return res.status(200).json({
      message: "Reset OTP sent.",
      otpRequired: true,
      email: user.email,
      type: user.type,
      otpFor: "reset_password",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, type, newPassword } = req.body;
    if (!email || !otp || !type || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, portal, and new password are required." });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Use 8+ characters with upper, lower, and number.",
      });
    }
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || user.type !== type) {
      return res.status(404).json({ message: "Account not found." });
    }
    if (
      user.otpPurpose !== "reset_password" ||
      !user.otpCodeHash ||
      !user.otpExpiresAt ||
      user.otpExpiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }
    const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hash !== user.otpCodeHash) {
      return res.status(400).json({ message: "Invalid OTP." });
    }
    user.password = await bcrypt.hash(String(newPassword), 10);
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpPurpose = "";
    user.otpAttempts = 0;
    await user.save();
    return res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= VERIFY SIGNUP OTP =================

const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp, type } = req.body;
    const emailNorm = normalizeEmail(email);
    const pending = await PendingSignup.findOne({ email: emailNorm });

    if (!pending) {
      return res.status(404).json({ message: "No pending signup found." });
    }
    if (type && pending.type !== type) {
      return res.status(400).json({ message: "Invalid account type." });
    }
    if (
      pending.otpPurpose !== "signup" ||
      !pending.otpCodeHash ||
      !pending.otpExpiresAt ||
      pending.otpExpiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "OTP expired. Sign up again." });
    }

    const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");

    if (hash !== pending.otpCodeHash) {
      pending.otpAttempts = (pending.otpAttempts || 0) + 1;
      if (pending.otpAttempts >= otpMaxAttempts) {
        await pending.deleteOne();
        return res.status(429).json({
          message: "Too many OTP attempts. Sign up again.",
        });
      }
      await pending.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    let user = await User.findOne({ email: emailNorm });
    if (user) {
      await pending.deleteOne();
      return res.status(400).json({ message: "Email already verified." });
    }

    user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      type: pending.type,
      isEmailVerified: true,
    });
    await pending.deleteOne();

    const token = createToken(user._id, user.type);

    return res.status(200).json({
      message: "Verified",
      token,
      user: userPayloadFor(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= VERIFY LOGIN OTP =================

const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) });

    const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");

    if (hash !== user.otpCodeHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const token = createToken(user._id, user.type);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userPayloadFor(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= GOOGLE AUTH (FIXED ERROR HANDLING) =================

const googleAuth = async (req, res) => {
  try {
    const { idToken, type } = req.body;

    if (!googleClient) {
      return res.status(500).json({ message: "Google not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = normalizeEmail(payload.email);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: payload.name,
        googleId: payload.sub,
        type,
        isEmailVerified: true,
      });
    }

    const token = createToken(user._id, user.type);

    return res.json({
      token,
      user: userPayloadFor(user),
    });
  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= ME =================

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: userPayloadFor(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};


// ================= EXPORTS =================

module.exports = {
  signup,
  login,
  resendOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifySignupOtp,
  verifyLoginOtp,
  googleAuth,
  me,
};