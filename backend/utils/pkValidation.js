/** Pakistan phone +92 and CNIC helpers */

const PK_PHONE_REGEX = /^\+923[0-9]{9}$/;

const normalizePhone = (raw) => {
  if (raw == null) return "";
  let s = String(raw).trim().replace(/\s+/g, "");
  if (s.startsWith("0092")) s = `+${s.slice(2)}`;
  if (s.startsWith("92") && !s.startsWith("+")) s = `+${s}`;
  if (s.startsWith("0") && s.length === 11) s = `+92${s.slice(1)}`;
  if (/^3[0-9]{9}$/.test(s)) s = `+92${s}`;
  return s;
};

const isValidPkPhone = (raw) => PK_PHONE_REGEX.test(normalizePhone(raw));

const normalizeCnic = (raw) => String(raw || "").replace(/[-\s]/g, "");

const isValidCnic = (raw) => {
  const d = normalizeCnic(raw);
  return /^[0-9]{13}$/.test(d);
};

const formatCnicDisplay = (digits13) => {
  const d = normalizeCnic(digits13);
  if (d.length !== 13) return d;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

module.exports = {
  normalizePhone,
  isValidPkPhone,
  normalizeCnic,
  isValidCnic,
  formatCnicDisplay,
};
