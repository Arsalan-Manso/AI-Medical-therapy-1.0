const express = require("express");
const { registerDoctorWithVerification } = require("../controllers/doctorRegisterController");
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

module.exports = router;
