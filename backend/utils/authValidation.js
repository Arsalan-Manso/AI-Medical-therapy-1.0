const NAME_REGEX = /^[A-Za-z ]{2,80}$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const validateName = (name) => NAME_REGEX.test(String(name || "").trim());

const validateEmail = (email) => EMAIL_REGEX.test(normalizeEmail(email));

const validatePassword = (password) => PASSWORD_REGEX.test(String(password || ""));

module.exports = {
  normalizeEmail,
  validateName,
  validateEmail,
  validatePassword,
  EMAIL_REGEX,
};
