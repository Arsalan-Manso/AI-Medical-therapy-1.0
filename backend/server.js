const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { MEDICAL_SPECIALTIES } = require("./constants/medicalSpecialties");
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const doctorAuthRoutes = require("./routes/doctorAuthRoutes");
const adminVerificationRoutes = require("./routes/adminVerificationRoutes");
const publicRoutes = require("./routes/publicRoutes");
const adminMessagesRoutes = require("./routes/adminMessagesRoutes");
const { PROVINCES, CITIES_BY_PROVINCE } = require("./constants/pakistanLocations");

dotenv.config({ path: './.env' });
connectDB();

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

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
