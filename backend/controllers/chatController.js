const mongoose = require("mongoose");
const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const { createChatCompletion, mapGeminiError } = require("../services/geminiService");

const deriveTitle = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "New conversation";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
};

const formatMessage = (doc) => ({
  id: doc._id.toString(),
  role: doc.role,
  content: doc.content,
  timestamp: doc.createdAt,
});

const formatSession = (session) => ({
  id: session._id.toString(),
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const ensureSessionOwner = async (sessionId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return null;
  }
  return ChatSession.findOne({ _id: sessionId, userId });
};

/** GET /api/chat/sessions */
const listSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ sessions: sessions.map(formatSession) });
  } catch (error) {
    console.error("[chat] listSessions:", error);
    return res.status(500).json({ message: "Failed to load chat sessions" });
  }
};

/** GET /api/chat/sessions/:sessionId */
const getSession = async (req, res) => {
  try {
    const session = await ensureSessionOwner(req.params.sessionId, req.user.userId);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    const messages = await Message.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      session: formatSession(session),
      messages: messages.map(formatMessage),
    });
  } catch (error) {
    console.error("[chat] getSession:", error);
    return res.status(500).json({ message: "Failed to load chat" });
  }
};

/** DELETE /api/chat/sessions/:sessionId */
const deleteSession = async (req, res) => {
  try {
    const session = await ensureSessionOwner(req.params.sessionId, req.user.userId);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    await Message.deleteMany({ sessionId: session._id });
    await session.deleteOne();

    return res.json({ message: "Chat deleted" });
  } catch (error) {
    console.error("[chat] deleteSession:", error);
    return res.status(500).json({ message: "Failed to delete chat" });
  }
};

/** POST /api/chat */
const postChat = async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};
    const trimmed = String(message || "").trim();

    if (!trimmed) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (trimmed.length > 8000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    let session;

    if (sessionId) {
      session = await ensureSessionOwner(sessionId, req.user.userId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
    } else {
      session = await ChatSession.create({
        userId: req.user.userId,
        title: deriveTitle(trimmed),
      });
    }

    const priorMessages = await Message.find({
      sessionId: session._id,
      role: { $in: ["user", "assistant"] },
    })
      .sort({ createdAt: 1 })
      .lean();

    const history = priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userDoc = await Message.create({
      sessionId: session._id,
      role: "user",
      content: trimmed,
    });

    let assistantText;
    try {
      assistantText = await createChatCompletion(history, trimmed);
    } catch (aiError) {
      console.error("[chat] Gemini:", aiError.message || aiError);
      await Message.deleteOne({ _id: userDoc._id });
      const msg = mapGeminiError(aiError);
      return res.status(503).json({ message: msg });
    }

    const assistantDoc = await Message.create({
      sessionId: session._id,
      role: "assistant",
      content: assistantText,
    });

    if (priorMessages.length === 0 && session.title === "New conversation") {
      session.title = deriveTitle(trimmed);
    }
    session.updatedAt = new Date();
    await session.save();

    return res.json({
      session: formatSession(session),
      reply: assistantText,
      userMessage: formatMessage(userDoc),
      assistantMessage: formatMessage(assistantDoc),
    });
  } catch (error) {
    console.error("[chat] postChat:", error);
    return res.status(500).json({ message: "Failed to process chat message" });
  }
};

module.exports = {
  listSessions,
  getSession,
  deleteSession,
  postChat,
};
