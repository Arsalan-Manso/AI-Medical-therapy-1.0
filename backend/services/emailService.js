const nodemailer = require("nodemailer");

const isInvalidEnv = (value) => !value || String(value).startsWith("your_") || String(value).includes("example");

const hasSmtp = () =>
  Boolean(
    process.env.SMTP_HOST &&
      !isInvalidEnv(process.env.SMTP_HOST) &&
      process.env.SMTP_USER &&
      !isInvalidEnv(process.env.SMTP_USER) &&
      process.env.SMTP_PASS &&
      !isInvalidEnv(process.env.SMTP_PASS)
  );
const hasGmail = () =>
  !isInvalidEnv(process.env.GMAIL_USER) &&
  !isInvalidEnv(process.env.GMAIL_APP_PASSWORD);

const getTransporter = () => {
  if (hasSmtp()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (hasGmail()) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return null;
};

const sendMail = async ({ to, subject, text, html }) => {
  const fromAddress =
    process.env.MAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "noreply@localhost";
  const fromName = process.env.MAIL_FROM_NAME || "AI Medical Therapy";
  const from = `${fromName} <${fromAddress}>`;
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error(
      "Email service is not configured. Set SMTP_* or GMAIL_USER and GMAIL_APP_PASSWORD."
    );
  }
  await transporter.sendMail({
    from,
    to,
    replyTo: fromAddress,
    subject,
    text,
    html,
    headers: {
      "X-Entity-Ref-ID": `ai-medical-therapy-${Date.now()}`,
    },
  });
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
