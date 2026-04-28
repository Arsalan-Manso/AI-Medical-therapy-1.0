const bcrypt = require("bcryptjs");
const User = require("../models/User");

const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

async function ensureDefaultAdmin() {
  try {
    const existing = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
    if (existing) return;

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await User.create({
      name: "System Administrator",
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      type: "Admin",
    });
    console.log(
      `Seeded default admin: ${DEFAULT_ADMIN_EMAIL} (password: ${DEFAULT_ADMIN_PASSWORD}) — change in production.`
    );
  } catch (err) {
    console.error("ensureDefaultAdmin:", err.message);
  }
}

module.exports = ensureDefaultAdmin;
