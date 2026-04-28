const express = require("express");
const { getDoctorProfile, updateDoctorProfile } = require("../controllers/doctorProfileController");
const {
  listDoctorRequests,
  updateDoctorRequest,
} = require("../controllers/appointmentController");
const { protect, authorizeTypes } = require("../middleware/authMiddleware");
const { requireApprovedDoctor } = require("../middleware/doctorVerificationMiddleware");

const router = express.Router();

router.get("/profile", protect, authorizeTypes("Doctor"), getDoctorProfile);
router.put("/profile", protect, authorizeTypes("Doctor"), updateDoctorProfile);
router.get(
  "/appointment-requests",
  protect,
  authorizeTypes("Doctor"),
  requireApprovedDoctor,
  listDoctorRequests
);
router.patch(
  "/appointment-requests/:id",
  protect,
  authorizeTypes("Doctor"),
  requireApprovedDoctor,
  updateDoctorRequest
);

module.exports = router;
