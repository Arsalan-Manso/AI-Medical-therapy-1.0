require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { MEDICAL_SPECIALTIES } = require("./constants/medicalSpecialties");
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const doctorAuthRoutes = require("./routes/doctorAuthRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const publicRoutes = require("./routes/publicRoutes");
const adminMessagesRoutes = require("./routes/adminMessagesRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { PROVINCES, CITIES_BY_PROVINCE } = require("./constants/pakistanLocations");
connectDB();

const isInvalidEnv = (value) => !value || String(value).startsWith("your_") || String(value).includes("example");

const requiredAuthEnv = [
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
];
const missingAuthEnv = requiredAuthEnv.filter((key) => isInvalidEnv(process.env[key]));
if (missingAuthEnv.length) {
  console.warn(
    `[auth-config] Missing/placeholder values: ${missingAuthEnv.join(
      ", "
    )}. Update backend/.env for Google + OTP auth.`
  );
}

if (isInvalidEnv(process.env.GEMINI_API_KEY)) {
  console.warn(
    "[gemini-config] GEMINI_API_KEY is missing or still a placeholder. Chat AI will not work until you set a free key from https://aistudio.google.com/apikey in backend/.env"
  );
}

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.json({ message: "AI Medical Therapy backend is running" });
});

app.get("/api/specialties", (req, res) => {
  res.json({ specialties: MEDICAL_SPECIALTIES });
});

app.get("/api/locations/pakistan", (req, res) => {
  res.json({ provinces: PROVINCES, citiesByProvince: CITIES_BY_PROVINCE });
});

app.use("/api/public", publicRoutes);

app.use("/api/auth/doctor", doctorAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminVerificationRoutes);
app.use("/api/admin", adminMessagesRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
