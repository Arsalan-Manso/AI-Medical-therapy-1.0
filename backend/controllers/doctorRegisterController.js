const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendMail } = require("../services/emailService");
const { PROVINCE_KEYS, isValidCityForProvince } = require("../constants/pakistanLocations");
const { normalizePhone, isValidPkPhone, normalizeCnic, isValidCnic } = require("../utils/pkValidation");
const { SPECIALTY_SLUGS, buildDoctorProfilePublic } = require("../constants/medicalSpecialties");
const {
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
} = require("../utils/authValidation");

const createToken = (userId, type) =>
  jwt.sign({ userId, type }, process.env.JWT_SECRET, { expiresIn: "7d" });
const otpValidityMs = 10 * 60 * 1000;
const otpResendCooldownMs = 60 * 1000;
const otpMaxAttempts = 5;

const buildOtpEmailHtml = (otpCode) => `
  <div style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #eaeaea;">
      <div style="background:#1f4e79; padding:22px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:20px; letter-spacing:0.5px;">AI Medical Therapy</h1>
      </div>
      <div style="padding:30px; color:#333333;">
        <h2 style="margin-top:0; font-size:18px; color:#1f4e79;">Verify Your Email Address</h2>
        <p style="font-size:14px; line-height:1.7;">
          Please verify your email to continue doctor onboarding and move to admin verification.
        </p>
        <div style="margin:25px 0; text-align:center;">
          <div style="display:inline-block; padding:14px 28px; font-size:26px; letter-spacing:6px; font-weight:bold; background:#f0f4ff; border:1px solid #1f4e79; border-radius:8px; color:#1f4e79;">
            ${otpCode}
          </div>
        </div>
        <p style="font-size:14px; line-height:1.7;">This code is valid for <b>10 minutes</b>.</p>
      </div>
    </div>
  </div>
`;

const issueDoctorSignupOtp = async (user) => {
  if (user.otpResendAfter && user.otpResendAfter.getTime() > Date.now()) {
    const secondsLeft = Math.ceil((user.otpResendAfter.getTime() - Date.now()) / 1000);
    throw new Error(`Please wait ${secondsLeft}s before requesting another OTP.`);
  }
  const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
  user.otpCodeHash = crypto.createHash("sha256").update(otpCode).digest("hex");
  user.otpExpiresAt = new Date(Date.now() + otpValidityMs);
  user.otpPurpose = "signup";
  user.otpAttempts = 0;
  user.otpResendAfter = new Date(Date.now() + otpResendCooldownMs);
  await user.save();
  await sendMail({
    to: user.email,
    subject: "AI Medical Therapy - Doctor Email Verification OTP",
    text: `Your OTP is ${otpCode}. It expires in 10 minutes.`,
    html: buildOtpEmailHtml(otpCode),
  });
};

const publicDoctorUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  type: user.type,
  doctorProfile: buildDoctorProfilePublic(user.doctorProfile),
  doctorVerification: user.doctorVerification
    ? {
        status: user.doctorVerification.status,
        province: user.doctorVerification.province,
        city: user.doctorVerification.city,
        address: user.doctorVerification.address || "",
        phone: user.doctorVerification.phone,
        cnicNumber: user.doctorVerification.cnicNumber,
        rejectionReason:
          user.doctorVerification.status === "rejected"
            ? user.doctorVerification.rejectionReason || ""
            : undefined,
      }
    : { status: "approved" },
});

const registerDoctorWithVerification = async (req, res) => {
  try {
    const files = req.files || {};
    const front = files.cnicFront?.[0];
    const back = files.cnicBack?.[0];
    const selfie = files.selfie?.[0];

    if (!front || !back || !selfie) {
      return res.status(400).json({
        message: "CNIC front, CNIC back, and document image are required",
      });
    }

    const {
      name,
      email,
      password,
      phone,
      province,
      city,
      address,
      cnicNumber,
      specialty,
    } = req.body;

    if (!name || !email || !password || !phone || !province || !city || !address || !cnicNumber) {
      return res.status(400).json({ message: "All registration fields are required" });
    }

    const pKey = String(province).trim();
    if (!PROVINCE_KEYS.has(pKey)) {
      return res.status(400).json({ message: "Invalid province" });
    }

    if (!isValidCityForProvince(pKey, city)) {
      return res.status(400).json({ message: "City does not match selected province" });
    }

    const phoneNorm = normalizePhone(phone);
    if (!isValidPkPhone(phoneNorm)) {
      return res.status(400).json({
        message: "Phone must be a valid Pakistan mobile e.g. +923001234567",
      });
    }

    const cnicNorm = normalizeCnic(cnicNumber);
    if (!isValidCnic(cnicNorm)) {
      return res.status(400).json({ message: "CNIC must be 13 digits" });
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
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      if (existing.type === "Doctor" && !existing.isEmailVerified) {
        existing.name = String(name).trim();
        existing.password = await bcrypt.hash(String(password), 10);
        existing.doctorVerification = {
          phone: phoneNorm,
          province: pKey,
          city: String(city).trim(),
          address: String(address).trim(),
          cnicNumber: cnicNorm,
          cnicFrontFile: front.filename,
          cnicBackFile: back.filename,
          selfieFile: selfie.filename,
          status: "pending",
          rejectionReason: "",
        };
        if (specialty && SPECIALTY_SLUGS.has(String(specialty).trim())) {
          const s = String(specialty).trim();
          existing.doctorProfile = { specialty: s, specialties: [s] };
        }
        await issueDoctorSignupOtp(existing);
        return res.status(200).json({
          message: "OTP sent. Verify email to continue to admin verification.",
          otpRequired: true,
          email: existing.email,
          type: existing.type,
        });
      }
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const dupCnic = await User.findOne({ "doctorVerification.cnicNumber": cnicNorm });
    if (dupCnic) {
      return res.status(400).json({ message: "This CNIC is already registered" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const docPayload = {
      phone: phoneNorm,
      province: pKey,
      city: String(city).trim(),
      address: String(address).trim(),
      cnicNumber: cnicNorm,
      cnicFrontFile: front.filename,
      cnicBackFile: back.filename,
      selfieFile: selfie.filename,
      status: "pending",
      rejectionReason: "",
    };

    const payload = {
      name: String(name).trim(),
      email: emailNorm,
      password: hashedPassword,
      type: "Doctor",
      isEmailVerified: false,
      doctorVerification: docPayload,
      doctorProfile: {},
    };

    if (specialty && SPECIALTY_SLUGS.has(String(specialty).trim())) {
      const s = String(specialty).trim();
      payload.doctorProfile.specialty = s;
      payload.doctorProfile.specialties = [s];
    }

    const user = await User.create(payload);
    await issueDoctorSignupOtp(user);

    return res.status(201).json({
      message: "OTP sent. Verify email to continue to admin verification.",
      otpRequired: true,
      email: user.email,
      type: user.type,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate email or CNIC" });
    }
    return res.status(500).json({ message: "Server error." });
  }
};

const verifyDoctorSignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }
    const user = await User.findOne({ email: normalizeEmail(email), type: "Doctor" });
    if (!user) return res.status(404).json({ message: "Doctor account not found." });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified." });
    if (
      user.otpPurpose !== "signup" ||
      !user.otpCodeHash ||
      !user.otpExpiresAt ||
      user.otpExpiresAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "OTP expired. Register again." });
    }
    const hash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (hash !== user.otpCodeHash) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= otpMaxAttempts) {
        user.otpCodeHash = "";
        user.otpExpiresAt = null;
        user.otpPurpose = "";
        await user.save();
        return res.status(429).json({ message: "Too many wrong OTP attempts. Register again." });
      }
      await user.save();
      return res.status(400).json({ message: "Invalid OTP." });
    }

    user.isEmailVerified = true;
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpPurpose = "";
    user.otpAttempts = 0;
    await user.save();

    const token = createToken(user._id, user.type);
    return res.status(200).json({
      message: "Email verified. Account submitted for admin verification.",
      token,
      user: publicDoctorUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = { registerDoctorWithVerification, verifyDoctorSignupOtp, publicDoctorUser };
