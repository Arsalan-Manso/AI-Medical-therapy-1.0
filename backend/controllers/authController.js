const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { publicDoctorUser } = require("./doctorRegisterController");

const allowedTypes = ["Admin", "Doctor", "Patient", "Pharmacy"];

const createToken = (userId, type) =>
  jwt.sign({ userId, type }, process.env.JWT_SECRET, { expiresIn: "7d" });

const signup = async (req, res) => {
  try {
    const { name, email, password, type } = req.body;

    if (!name || !email || !password || !type) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (type === "Admin") {
      return res.status(403).json({
        message:
          "Admin accounts are not self-service. Use the administrator sign-in portal with your issued credentials.",
      });
    }

    if (type === "Doctor") {
      return res.status(400).json({
        message:
          "Doctors must register with CNIC verification and document upload. Use the doctor verification portal.",
        code: "DOCTOR_USE_VERIFICATION_PORTAL",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailNorm });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: emailNorm,
      password: hashedPassword,
      type,
    });

    const token = createToken(user._id, user.type);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, type } = req.body;

    if (!email || !password || !type) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.type !== type) {
      return res
        .status(403)
        .json({ message: "This account does not belong to this portal type" });
    }

    const token = createToken(user._id, user.type);

    const userPayload =
      user.type === "Doctor"
        ? publicDoctorUser(user)
        : {
            id: user._id,
            name: user.name,
            email: user.email,
            type: user.type,
          };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: userPayload,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.type === "Doctor") {
      return res.status(200).json({ user: publicDoctorUser(user) });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        patientProfile: user.patientProfile || null,
        doctorProfile: user.doctorProfile || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signup, login, me, allowedTypes };
