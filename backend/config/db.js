const mongoose = require("mongoose");
const ensureDefaultAdmin = require("../utils/ensureDefaultAdmin");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("MongoDB connection error: set MONGODB_URI or MONGO_URI in .env");
      process.exit(1);
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await ensureDefaultAdmin();
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
