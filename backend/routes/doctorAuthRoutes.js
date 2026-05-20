const express = require("express");
const {
  registerDoctorWithVerification,
  verifyDoctorSignupOtp,
} = require("../controllers/doctorRegisterController");
const {
  uploadDoctorDocs,
  handleMulterError,
} = require("../middleware/uploadDoctorVerification");

const router = express.Router();

router.post(
  "/register",
  uploadDoctorDocs,
  handleMulterError,
  registerDoctorWithVerification
);
router.post("/register/verify-otp", verifyDoctorSignupOtp);

module.exports = router;
