const User = require("../models/User");

/**
 * Doctors registered with verification must be approved to use clinical APIs.
 * Legacy doctors (no doctorVerification subdoc) are treated as approved.
 */
const requireApprovedDoctor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("type doctorVerification");
    if (!user || user.type !== "Doctor") {
      return res.status(403).json({ message: "Doctor access only" });
    }
    const dv = user.doctorVerification;
    if (!dv) {
      return next();
    }
    if (dv.status === "approved") {
      return next();
    }
    return res.status(403).json({
      code: "VERIFICATION_REQUIRED",
      message:
        dv.status === "pending"
          ? "Your account is pending admin verification."
          : "Your verification was not approved.",
      status: dv.status,
      rejectionReason: dv.status === "rejected" ? dv.rejectionReason || "" : undefined,
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: e.message });
  }
};

module.exports = { requireApprovedDoctor };
