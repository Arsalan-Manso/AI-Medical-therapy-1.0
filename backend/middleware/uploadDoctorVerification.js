const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "verification");

const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    const name = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${safeExt}`;
    cb(null, name);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
  if (allowed) return cb(null, true);
  cb(new Error("Only JPEG, PNG, or WebP images are allowed"));
};

const uploadDoctorDocs = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: "cnicFront", maxCount: 1 },
  { name: "cnicBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Each file must be under 5MB" });
    }
    return res.status(400).json({ message: err.message });
  }
  return res.status(400).json({ message: err.message || "Upload failed" });
};

module.exports = {
  UPLOAD_ROOT,
  uploadDoctorDocs,
  handleMulterError,
};
