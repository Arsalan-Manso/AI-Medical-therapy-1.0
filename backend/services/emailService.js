const nodemailer = require("nodemailer");

const hasSmtp = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!hasSmtp()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@localhost";
  const transporter = getTransporter();
  if (!transporter) {
    console.info("[email] SMTP not configured — would send:", { to, subject, text: text?.slice(0, 120) });
    return { skipped: true };
  }
  await transporter.sendMail({ from, to, subject, text, html });
  return { sent: true };
};

const notifyDoctorVerification = async (email, name, status, rejectionReason) => {
  const subject =
    status === "approved"
      ? "Your doctor verification was approved"
      : "Update on your doctor verification";
  const text =
    status === "approved"
      ? `Hi ${name},\n\nYour AI Medical Therapy doctor account is approved. You can log in and use the full dashboard.\n`
      : `Hi ${name},\n\nYour doctor verification was not approved.\n${rejectionReason ? `Reason: ${rejectionReason}\n` : ""}\nYou may contact support if you believe this is an error.\n`;
  return sendMail({ to: email, subject, text });
};

module.exports = { sendMail, notifyDoctorVerification, hasSmtp };
