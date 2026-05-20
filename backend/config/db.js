const mongoose = require("mongoose");
const ensureDefaultAdmin = require("../utils/ensureDefaultAdmin");

const connectDB = async () => {
  try {
  
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error(" MONGO_URI is missing in environment variables");
      process.exit(1);
    }

    const conn = await mongoose.connect(uri);

    console.log(` MongoDB connected: ${conn.connection.host}`);

   
    if (process.env.ALLOW_DEFAULT_ADMIN_SEED === "true") {
      await ensureDefaultAdmin();
    }

  } catch (error) {
    console.error(` MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;