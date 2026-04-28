const express = require("express");
const { listContactMessages, markMessageRead } = require("../controllers/contactController");
const { protect, authorizeTypes } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorizeTypes("Admin"));

router.get("/messages", listContactMessages);
router.patch("/messages/:id/read", markMessageRead);

module.exports = router;
