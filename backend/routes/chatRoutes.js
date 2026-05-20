const express = require("express");
const {
  listSessions,
  getSession,
  deleteSession,
  postChat,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/sessions", listSessions);
router.get("/sessions/:sessionId", getSession);
router.delete("/sessions/:sessionId", deleteSession);
router.post("/", postChat);

module.exports = router;
