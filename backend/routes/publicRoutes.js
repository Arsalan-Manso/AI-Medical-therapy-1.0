const express = require("express");
const User = require("../models/User");
const { submitPublicContact } = require("../controllers/contactController");

const router = express.Router();

router.post("/contact", submitPublicContact);

router.get("/stats", async (req, res) => {
  try {
    const [patientsServed, doctorsOnboarded, pharmaciesLinked] = await Promise.all([
      User.countDocuments({ type: "Patient" }),
      User.countDocuments({ type: "Doctor" }),
      User.countDocuments({ type: "Pharmacy" }),
    ]);

    res.json({
      patientsServed,
      doctorsOnboarded,
      pharmaciesLinked,
      uptimeGuaranteed: process.env.LANDING_UPTIME_LABEL || "99.9%",
    });
  } catch (err) {
    console.error("public /stats:", err);
    res.status(500).json({ message: "Could not load platform stats." });
  }
});

module.exports = router;
