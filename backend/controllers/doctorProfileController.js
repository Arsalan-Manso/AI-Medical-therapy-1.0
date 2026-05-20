const User = require("../models/User");
const { SPECIALTY_SLUGS } = require("../constants/medicalSpecialties");
const { PROVINCE_KEYS, isValidCityForProvince } = require("../constants/pakistanLocations");
const { normalizePhone, isValidPkPhone } = require("../utils/pkValidation");
const { publicDoctorUser } = require("./doctorRegisterController");
const { validateName } = require("../utils/authValidation");

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

const ALLOWED_AVAILABILITY = new Set(["online", "physical", "both"]);
const ALLOWED_WORKING_DAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const toNonNegativeFee = (value, label) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return { error: `${label} must be a non-negative number` };
  }
  return { value: Math.round(num) };
};

const getDoctorProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user: publicDoctorUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const {
      name,
      profilePictureUrl,
      phone,
      province,
      city,
      address,
      clinicAddress,
      availabilityMode,
      consultationFees,
      workingDays,
      timeSlots,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.doctorProfile = user.doctorProfile || {};
    let updated = false;

    if (name !== undefined && name !== null) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2) {
        return res.status(400).json({ message: "Name is too short." });
      }
      if (!validateName(trimmed)) {
        return res.status(400).json({ message: "Name must contain letters only." });
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

    if (clinicAddress !== undefined) {
      user.doctorProfile.clinicAddress = String(clinicAddress || "").trim().slice(0, 240);
      updated = true;
    }

    if (availabilityMode !== undefined) {
      const mode = String(availabilityMode || "").trim().toLowerCase();
      if (mode && !ALLOWED_AVAILABILITY.has(mode)) {
        return res.status(400).json({ message: "Availability must be online, physical, or both" });
      }
      user.doctorProfile.availabilityMode = mode || "both";
      updated = true;
    }

    if (consultationFees !== undefined && consultationFees !== null) {
      const fees = consultationFees || {};
      const f30 = toNonNegativeFee(fees.fee30Min ?? 0, "30 minute fee");
      if (f30.error) return res.status(400).json({ message: f30.error });
      const f60 = toNonNegativeFee(fees.fee1Hour ?? 0, "1 hour fee");
      if (f60.error) return res.status(400).json({ message: f60.error });
      const f180 = toNonNegativeFee(fees.fee3Hour ?? 0, "3 hour fee");
      if (f180.error) return res.status(400).json({ message: f180.error });
      user.doctorProfile.consultationFees = {
        fee30Min: f30.value,
        fee1Hour: f60.value,
        fee3Hour: f180.value,
      };
      updated = true;
    }

    if (workingDays !== undefined) {
      if (!Array.isArray(workingDays)) {
        return res.status(400).json({ message: "Working days must be an array" });
      }
      const normalized = [...new Set(workingDays.map((d) => String(d || "").trim().toLowerCase()))].filter(
        (d) => ALLOWED_WORKING_DAYS.has(d)
      );
      user.doctorProfile.workingDays = normalized;
      updated = true;
    }

    if (timeSlots !== undefined) {
      if (!Array.isArray(timeSlots)) {
        return res.status(400).json({ message: "Time slots must be an array" });
      }
      const normalized = [...new Set(timeSlots.map((s) => String(s || "").trim()).filter(Boolean))]
        .slice(0, 24);
      user.doctorProfile.timeSlots = normalized;
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
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = { getDoctorProfile, updateDoctorProfile };
