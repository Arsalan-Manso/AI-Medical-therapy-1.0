const ContactMessage = require("../models/ContactMessage");
const { sendMail } = require("../services/emailService");

const submitPublicContact = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const subject = String(req.body.subject || "").trim().slice(0, 200);
    const message = String(req.body.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required." });
    }
    if (message.length < 5) {
      return res.status(400).json({ message: "Please write a slightly longer message." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const doc = await ContactMessage.create({ name, email, subject, message });

    const notifyTo = process.env.ADMIN_NOTIFY_EMAIL || "admin@gmail.com";
    const subj = `[AI Medical Therapy] Contact: ${subject || "(no subject)"} — ${name}`;
    const text = `New message from the landing page.\n\nFrom: ${name} <${email}>\nSubject: ${subject || "—"}\n\n${message}\n\n— Stored as id ${doc._id}`;

    await sendMail({ to: notifyTo, subject: subj, text });

    return res.status(201).json({
      message: "Thank you — your message was delivered to our team.",
      id: doc._id,
    });
  } catch (err) {
    console.error("submitPublicContact:", err);
    return res.status(500).json({ message: "Could not send your message. Please try again later." });
  }
};

const listContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(150)
      .lean();
    const unread = await ContactMessage.countDocuments({ read: false });
    return res.json({ messages, unread });
  } catch (err) {
    console.error("listContactMessages:", err);
    return res.status(500).json({ message: "Could not load messages." });
  }
};

const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await ContactMessage.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json({ message: updated });
  } catch (err) {
    return res.status(500).json({ message: "Update failed." });
  }
};

module.exports = { submitPublicContact, listContactMessages, markMessageRead };
