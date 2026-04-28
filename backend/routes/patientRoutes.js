const express = require("express");
const { getProfile, updateProfile } = require("../controllers/patientProfileController");
const {
  listDoctorsForPatient,
  createAppointmentRequest,
  listPatientAppointments,
} = require("../controllers/appointmentController");
const { protect, authorizeTypes } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, authorizeTypes("Patient"), getProfile);
router.put("/profile", protect, authorizeTypes("Patient"), updateProfile);
router.get("/doctors", protect, authorizeTypes("Patient"), listDoctorsForPatient);
router.get("/appointments", protect, authorizeTypes("Patient"), listPatientAppointments);
router.post("/appointments/request", protect, authorizeTypes("Patient"), createAppointmentRequest);

module.exports = router;
