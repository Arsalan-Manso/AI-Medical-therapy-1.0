const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { UPLOAD_ROOT } = require("../middleware/uploadDoctorVerification");
const { formatCnicDisplay } = require("../utils/pkValidation");
const { PROVINCES, CITIES_BY_PROVINCE } = require("../constants/pakistanLocations");
const { buildDoctorProfilePublic } = require("../constants/medicalSpecialties");
const { notifyDoctorVerification } = require("../services/emailService");

const KIND_MAP = {
  cnicFront: "cnicFrontFile",
  cnicBack: "cnicBackFile",
  selfie: "selfieFile",
};

const provinceLabel = (key) => PROVINCES.find((p) => p.key === key)?.label || key;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unlinkVerificationFiles = (doctorVerification) => {
  if (!doctorVerification) return;
  const root = path.resolve(UPLOAD_ROOT);
  for (const field of ["cnicFrontFile", "cnicBackFile", "selfieFile"]) {
    const fname = doctorVerification[field];
    if (!fname) continue;
    const basename = path.basename(fname);
    const abs = path.resolve(UPLOAD_ROOT, basename);
    if (!abs.startsWith(root)) continue;
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (err) {
      console.error("unlinkVerificationFiles:", err.message);
    }
  }
};

const listVerificationDoctors = async (req, res) => {
  try {
    const { q, status } = req.query;
    const query = { type: "Doctor", isEmailVerified: true };

    if (status && ["pending", "approved", "rejected"].includes(String(status))) {
      query["doctorVerification.status"] = String(status);
    }

    let mongoQuery = query;
    if (q && String(q).trim()) {
      const term = String(q).trim();
      const cnicDigits = term.replace(/\D/g, "");
      const or = [
        { name: new RegExp(escapeRegex(term), "i") },
        { email: new RegExp(escapeRegex(term), "i") },
      ];
      if (cnicDigits.length === 13) {
        or.push({ "doctorVerification.cnicNumber": cnicDigits });
      } else if (cnicDigits.length >= 5) {
        or.push({ "doctorVerification.cnicNumber": new RegExp(cnicDigits) });
      }
      mongoQuery = { $and: [query, { $or: or }] };
    }

    const users = await User.find(mongoQuery)
      .select(
        "name email createdAt doctorVerification doctorProfile"
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const rows = users.map((u) => {
      const dv = u.doctorVerification;
      if (!dv) {
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          legacy: true,
          status: "approved",
          specialtyLabel: buildDoctorProfilePublic(u.doctorProfile).specialtiesDisplay || "",
        };
      }
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        legacy: false,
        status: dv.status,
        phone: dv.phone,
        province: dv.province,
        provinceLabel: provinceLabel(dv.province),
        city: dv.city,
        address: dv.address,
        cnicNumber: dv.cnicNumber,
        cnicFormatted: formatCnicDisplay(dv.cnicNumber),
        specialtyLabel: buildDoctorProfilePublic(u.doctorProfile).specialtiesDisplay || "",
        hasDocuments: Boolean(dv.cnicFrontFile && dv.cnicBackFile && dv.selfieFile),
        rejectionReason: dv.rejectionReason || "",
      };
    });

    return res.status(200).json({ doctors: rows, provinces: PROVINCES, citiesByProvince: CITIES_BY_PROVINCE });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const serveDoctorDocument = async (req, res) => {
  try {
    const { id, kind } = req.params;
    const field = KIND_MAP[kind];
    if (!field) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    const user = await User.findById(id).select("type doctorVerification");
    if (!user || user.type !== "Doctor" || !user.doctorVerification) {
      return res.status(404).json({ message: "Not found" });
    }

    const fname = user.doctorVerification[field];
    if (!fname) {
      return res.status(404).json({ message: "File not found" });
    }

    const basename = path.basename(fname);
    const abs = path.resolve(UPLOAD_ROOT, basename);
    if (!abs.startsWith(path.resolve(UPLOAD_ROOT))) {
      return res.status(400).json({ message: "Invalid path" });
    }
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ message: "File missing on server" });
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(abs);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const user = await User.findById(id);
    if (!user || user.type !== "Doctor" || !user.doctorVerification) {
      return res.status(404).json({ message: "Doctor not found or not on verification program" });
    }
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Doctor email is not verified yet." });
    }

    if (user.doctorVerification.status !== "pending") {
      return res.status(400).json({ message: "This application is no longer pending" });
    }

    user.doctorVerification.status = status;
    user.doctorVerification.rejectionReason =
      status === "rejected" ? String(rejectionReason || "").slice(0, 500) : "";
    user.doctorVerification.reviewedAt = new Date();
    await user.save();

    await notifyDoctorVerification(
      user.email,
      user.name,
      status,
      user.doctorVerification.rejectionReason
    );

    return res.status(200).json({
      message: status === "approved" ? "Doctor approved" : "Doctor rejected",
      doctor: {
        id: user._id,
        email: user.email,
        status: user.doctorVerification.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteDoctorAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.type !== "Doctor") {
      return res.status(404).json({ message: "Doctor account not found." });
    }

    unlinkVerificationFiles(user.doctorVerification);
    await User.findByIdAndDelete(id);

    return res.status(200).json({ message: "Doctor account removed." });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  listVerificationDoctors,
  serveDoctorDocument,
  updateVerificationStatus,
  deleteDoctorAccount,
};
