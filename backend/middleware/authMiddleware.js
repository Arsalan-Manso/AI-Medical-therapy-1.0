const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

const authorizeTypes = (...types) => (req, res, next) => {
  if (!req.user || !types.includes(req.user.type)) {
    return res.status(403).json({ message: "Access denied for this type" });
  }
  return next();
};

module.exports = { protect, authorizeTypes };
