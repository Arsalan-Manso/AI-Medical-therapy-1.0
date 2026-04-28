const express = require("express");
const {
  listVerificationDoctors,
  serveDoctorDocument,
  updateVerificationStatus,
  deleteDoctorAccount,
} = require("../controllers/adminVerificationController");
const { protect, authorizeTypes } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorizeTypes("Admin"));

router.get("/verifications/doctors", listVerificationDoctors);
router.get("/verifications/doctors/:id/document/:kind", serveDoctorDocument);
router.patch("/verifications/doctors/:id/status", updateVerificationStatus);
router.delete("/verifications/doctors/:id", deleteDoctorAccount);

module.exports = router;
