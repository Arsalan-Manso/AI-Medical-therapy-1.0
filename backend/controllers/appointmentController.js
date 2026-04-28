const mongoose = require("mongoose");
const User = require("../models/User");
const AppointmentRequest = require("../models/AppointmentRequest");
const {
  SPECIALTY_SLUGS,
  labelForSlug,
  doctorSpecialtySlugsFromProfile,
} = require("../constants/medicalSpecialties");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listDoctorsForPatient = async (req, res) => {
  try {
    const name = req.query.name || "";
    const specialty = req.query.specialty || "";

    const andClauses = [
      { type: "Doctor" },
      {
        $or: [
          { doctorVerification: { $exists: false } },
          { "doctorVerification.status": "approved" },
        ],
      },
    ];
    if (name.trim()) {
      andClauses.push({ name: new RegExp(escapeRegex(name.trim()), "i") });
    }
    if (specialty.trim() && SPECIALTY_SLUGS.has(specialty.trim())) {
      const slug = specialty.trim();
      andClauses.push({
        $or: [
          { "doctorProfile.specialties": slug },
          { "doctorProfile.specialty": slug },
        ],
      });
    }

    const doctors = await User.find({ $and: andClauses })
      .select("name email doctorProfile doctorVerification createdAt")
      .sort({ name: 1 })
      .limit(60)
      .lean();

    const placeholderRating = (id) => {
      const s = String(id);
      let h = 0;
      for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      const frac = (h % 18) / 10;
      return Math.round((4.2 + frac) * 10) / 10;
    };

    const list = doctors.map((d) => {
      const slugs = doctorSpecialtySlugsFromProfile(d.doctorProfile);
      const specLabel =
        slugs.length > 0 ? slugs.map(labelForSlug).join(" · ") : "Specialty not set yet";
      return {
      id: d._id,
      name: d.name,
      email: d.email,
      specialty: slugs.join(",") || "",
      specialtyLabel: specLabel,
      practiceCity: d.doctorVerification?.city?.trim() || "",
      practiceProvince: d.doctorVerification?.province?.trim() || "",
      practicePhone: d.doctorVerification?.phone?.trim() || "",
      practiceAddress: d.doctorVerification?.address?.trim() || "",
      memberSince: d.createdAt || null,
      rating: placeholderRating(d._id),
      reviewCount: 12 + ((String(d._id).length * 7) % 80),
    };
    });

    return res.status(200).json({ doctors: list });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createAppointmentRequest = async (req, res) => {
  try {
    const { doctorId, specialtyRequested, preferredDate, notes } = req.body;
    const patientId = req.user.userId;

    if (!doctorId || !specialtyRequested) {
      return res.status(400).json({ message: "Doctor and specialty are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor" });
    }

    const slug = String(specialtyRequested).trim();
    if (!SPECIALTY_SLUGS.has(slug)) {
      return res.status(400).json({ message: "Invalid specialty" });
    }

    const doctor = await User.findOne({ _id: doctorId, type: "Doctor" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    if (doctor.doctorVerification && doctor.doctorVerification.status !== "approved") {
      return res.status(400).json({ message: "This doctor is not available for booking yet" });
    }

    const offered = doctorSpecialtySlugsFromProfile(doctor.doctorProfile);
    if (offered.length > 0 && !offered.includes(slug)) {
      return res.status(400).json({
        message: "That specialty is not listed for this doctor",
      });
    }

    const dup = await AppointmentRequest.findOne({
      patient: patientId,
      doctor: doctorId,
      status: "pending",
    });
    if (dup) {
      return res.status(400).json({
        message: "You already have a pending request with this doctor",
      });
    }

    let prefDate;
    if (preferredDate) {
      prefDate = new Date(preferredDate);
      if (Number.isNaN(prefDate.getTime())) {
        return res.status(400).json({ message: "Invalid preferred date" });
      }
    }

    const appt = await AppointmentRequest.create({
      patient: patientId,
      doctor: doctorId,
      specialtyRequested: slug,
      preferredDate: prefDate,
      notes: notes ? String(notes).slice(0, 2000) : "",
      status: "pending",
    });

    await appt.populate("doctor", "name email doctorProfile");

    return res.status(201).json({
      message: "Request sent",
      appointment: formatPatientAppointment(appt),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const formatPatientAppointment = (doc) => {
  const d = doc.doctor;
  const oid = doc._id ?? doc.id;
  const docSlugs = d?.doctorProfile ? doctorSpecialtySlugsFromProfile(d.doctorProfile) : [];
  const docSpecLabel =
    docSlugs.length > 0 ? docSlugs.map(labelForSlug).join(" · ") : null;
  return {
    id: oid,
    status: doc.status,
    specialtyRequested: doc.specialtyRequested,
    specialtyLabel: labelForSlug(doc.specialtyRequested),
    preferredDate: doc.preferredDate,
    notes: doc.notes,
    scheduledAt: doc.scheduledAt,
    doctorMessage: doc.doctorMessage,
    createdAt: doc.createdAt,
    doctor: d
      ? {
          id: d._id,
          name: d.name,
          email: d.email,
          specialtyLabel: docSpecLabel,
        }
      : null,
  };
};

const listPatientAppointments = async (req, res) => {
  try {
    const list = await AppointmentRequest.find({ patient: req.user.userId })
      .populate("doctor", "name email doctorProfile")
      .sort({ createdAt: -1 })
      .lean();

    const appointments = list.map((row) =>
      formatPatientAppointment({
        ...row,
        doctor: row.doctor,
      })
    );

    return res.status(200).json({ appointments });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const patientSnapshot = (userDoc) => {
  if (!userDoc) return null;
  const p = userDoc.patientProfile || {};
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    patientProfile: {
      fullName: p.fullName || userDoc.name,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      profilePictureUrl: p.profilePictureUrl || "",
      phone: p.phone || "",
      contactEmail: p.contactEmail || userDoc.email,
      city: p.city || "",
      addressLine: p.addressLine || "",
      emergencyContactName: p.emergencyContactName || "",
      emergencyContactPhone: p.emergencyContactPhone || "",
      bloodType: p.bloodType || "",
    },
  };
};

const listDoctorRequests = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const status = req.query.status;

    const query = { doctor: doctorId };
    if (status && ["pending", "approved", "declined", "cancelled"].includes(status)) {
      query.status = status;
    }

    const list = await AppointmentRequest.find(query)
      .populate("patient", "name email patientProfile type")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const requests = list.map((row) => ({
      id: row._id,
      status: row.status,
      specialtyRequested: row.specialtyRequested,
      specialtyLabel: labelForSlug(row.specialtyRequested),
      preferredDate: row.preferredDate,
      notes: row.notes,
      scheduledAt: row.scheduledAt,
      doctorMessage: row.doctorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: patientSnapshot(row.patient),
    }));

    return res.status(200).json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateDoctorRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledAt, doctorMessage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or declined" });
    }

    const appt = await AppointmentRequest.findOne({
      _id: id,
      doctor: req.user.userId,
    });

    if (!appt) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (appt.status !== "pending") {
      return res.status(400).json({ message: "This request is no longer pending" });
    }

    appt.status = status;
    if (doctorMessage !== undefined && doctorMessage !== null) {
      appt.doctorMessage = String(doctorMessage).slice(0, 1000);
    }

    if (status === "approved" && scheduledAt) {
      const dt = new Date(scheduledAt);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ message: "Invalid scheduled date/time" });
      }
      appt.scheduledAt = dt;
    } else if (status === "declined") {
      appt.scheduledAt = undefined;
    }

    await appt.save();
    await appt.populate("patient", "name email patientProfile type");

    return res.status(200).json({
      message: status === "approved" ? "Appointment approved" : "Request declined",
      request: {
        id: appt._id,
        status: appt.status,
        scheduledAt: appt.scheduledAt,
        doctorMessage: appt.doctorMessage,
        patient: patientSnapshot(appt.patient),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  listDoctorsForPatient,
  createAppointmentRequest,
  listPatientAppointments,
  listDoctorRequests,
  updateDoctorRequest,
};
