const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { PROVINCE_KEYS, isValidCityForProvince } = require("../constants/pakistanLocations");
const { normalizePhone, isValidPkPhone, normalizeCnic, isValidCnic } = require("../utils/pkValidation");
const { SPECIALTY_SLUGS, buildDoctorProfilePublic } = require("../constants/medicalSpecialties");

const createToken = (userId, type) =>
  jwt.sign({ userId, type }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
        message: "CNIC front, CNIC back, and selfie images are required",
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

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
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
      doctorVerification: docPayload,
      doctorProfile: {},
    };

    if (specialty && SPECIALTY_SLUGS.has(String(specialty).trim())) {
      const s = String(specialty).trim();
      payload.doctorProfile.specialty = s;
      payload.doctorProfile.specialties = [s];
    }

    const user = await User.create(payload);
    const token = createToken(user._id, user.type);

    return res.status(201).json({
      message: "Registration submitted. Your account is pending verification.",
      token,
      user: publicDoctorUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate email or CNIC" });
    }
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerDoctorWithVerification, publicDoctorUser };
