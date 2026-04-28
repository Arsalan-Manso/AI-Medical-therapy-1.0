const User = require("../models/User");
const { SPECIALTY_SLUGS } = require("../constants/medicalSpecialties");
const { PROVINCE_KEYS, isValidCityForProvince } = require("../constants/pakistanLocations");
const { normalizePhone, isValidPkPhone } = require("../utils/pkValidation");
const { publicDoctorUser } = require("./doctorRegisterController");

const parseSpecialtiesUpdate = (body) => {
  if (Object.prototype.hasOwnProperty.call(body, "specialties")) {
    if (!Array.isArray(body.specialties)) {
      return { error: "specialties must be an array" };
    }
    const slugs = [
      ...new Set(
        body.specialties
          .map((x) => String(x || "").trim())
          .filter((s) => SPECIALTY_SLUGS.has(s))
      ),
    ];
    if (slugs.length === 0) {
      return { error: "Select at least one valid specialty" };
    }
    return { slugs };
  }
  if (
    body.specialty !== undefined &&
    body.specialty !== null &&
    String(body.specialty).trim()
  ) {
    const s = String(body.specialty).trim();
    if (!SPECIALTY_SLUGS.has(s)) {
      return { error: "Please choose a valid specialty" };
    }
    return { slugs: [s] };
  }
  return { slugs: undefined };
};

const getDoctorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: publicDoctorUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const { name, profilePictureUrl, phone, province, city, address } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.doctorProfile = user.doctorProfile || {};
    let updated = false;

    if (name !== undefined && name !== null) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }
      user.name = trimmed;
      updated = true;
    }

    const specResult = parseSpecialtiesUpdate(req.body);
    if (specResult.error) {
      return res.status(400).json({ message: specResult.error });
    }
    if (specResult.slugs) {
      user.doctorProfile.specialties = specResult.slugs;
      user.doctorProfile.specialty = specResult.slugs[0] || "";
      updated = true;
    }

    if (profilePictureUrl !== undefined) {
      user.doctorProfile.profilePictureUrl = String(profilePictureUrl || "");
      updated = true;
    }

    if (user.doctorVerification) {
      const dv = user.doctorVerification;
      if (phone !== undefined && phone !== null) {
        const raw = String(phone).trim();
        if (raw) {
          const phoneNorm = normalizePhone(phone);
          if (!isValidPkPhone(phoneNorm)) {
            return res.status(400).json({
              message: "Phone must be a valid Pakistan mobile e.g. +923001234567",
            });
          }
          dv.phone = phoneNorm;
        } else {
          dv.phone = "";
        }
        updated = true;
      }
      if (province !== undefined && province !== null) {
        const pKey = String(province).trim();
        if (pKey && !PROVINCE_KEYS.has(pKey)) {
          return res.status(400).json({ message: "Invalid province" });
        }
        dv.province = pKey;
        updated = true;
      }
      if (city !== undefined && city !== null) {
        dv.city = String(city).trim();
        updated = true;
      }
      if (address !== undefined && address !== null) {
        dv.address = String(address).trim();
        updated = true;
      }
    } else if (
      phone !== undefined ||
      province !== undefined ||
      city !== undefined ||
      address !== undefined
    ) {
      return res.status(400).json({
        message: "Practice location can only be updated for verified doctor accounts",
      });
    }

    if (user.doctorVerification) {
      const dv = user.doctorVerification;
      if (dv.province && dv.city && !isValidCityForProvince(dv.province, dv.city)) {
        return res.status(400).json({ message: "City does not match selected province" });
      }
    }

    if (!updated) {
      return res.status(400).json({ message: "No profile changes to save" });
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated",
      user: publicDoctorUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getDoctorProfile, updateDoctorProfile };
