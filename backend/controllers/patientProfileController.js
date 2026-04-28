const User = require("../models/User");
const { normalizePhone, isValidPkPhone } = require("../utils/pkValidation");

const allowedGender = ["male", "female", "other", "prefer_not_to_say"];

const normalizeGender = (gender) => {
  const g = String(gender || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return allowedGender.includes(g) ? g : null;
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        patientProfile: user.patientProfile || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      profilePictureUrl,
      phone,
      contactEmail,
      city,
      addressLine,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
    } = req.body;

    if (!fullName || !dateOfBirth || !gender) {
      return res
        .status(400)
        .json({ message: "Full name, date of birth, and gender are required" });
    }

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const phoneNorm = normalizePhone(phone);
    if (!isValidPkPhone(phoneNorm)) {
      return res.status(400).json({
        message: "Phone must be a valid Pakistan mobile number e.g. +923001234567",
      });
    }

    if (!city || !String(city).trim()) {
      return res.status(400).json({ message: "City is required" });
    }

    const g = normalizeGender(gender);
    if (!g) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const trimmedName = String(fullName).trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const prev = user.patientProfile || {};
    const picture =
      profilePictureUrl !== undefined && profilePictureUrl !== null
        ? String(profilePictureUrl)
        : prev.profilePictureUrl || "";

    const emailTrim =
      contactEmail !== undefined && contactEmail !== null && String(contactEmail).trim()
        ? String(contactEmail).trim().toLowerCase()
        : user.email;

    let emergPhone = prev.emergencyContactPhone || "";
    if (emergencyContactPhone !== undefined && emergencyContactPhone !== null) {
      const es = String(emergencyContactPhone).trim();
      if (es) {
        const en = normalizePhone(es);
        if (!isValidPkPhone(en)) {
          return res.status(400).json({
            message: "Emergency contact phone must be a valid +92 Pakistan mobile number",
          });
        }
        emergPhone = en;
      } else {
        emergPhone = "";
      }
    }

    user.name = trimmedName;
    user.patientProfile = {
      fullName: trimmedName,
      dateOfBirth: dob,
      gender: g,
      profilePictureUrl: picture,
      phone: phoneNorm,
      contactEmail: emailTrim,
      city: String(city).trim(),
      addressLine:
        addressLine !== undefined && addressLine !== null
          ? String(addressLine).trim()
          : prev.addressLine || "",
      emergencyContactName:
        emergencyContactName !== undefined && emergencyContactName !== null
          ? String(emergencyContactName).trim()
          : prev.emergencyContactName || "",
      emergencyContactPhone: emergPhone,
      bloodType:
        bloodType !== undefined && bloodType !== null
          ? String(bloodType).trim()
          : prev.bloodType || "",
    };
    await user.save();

    return res.status(200).json({
      message: "Profile saved",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        patientProfile: user.patientProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getProfile, updateProfile };
