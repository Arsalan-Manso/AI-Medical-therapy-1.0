const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT =
  "You are a professional AI medical therapy assistant. Never claim to be a real doctor.";

const DEFAULT_MODEL = "gemini-1.5-flash";

let genAI;

const isInvalidApiKey = (value) =>
  !value ||
  String(value).trim().length < 20 ||
  /^your_/i.test(value) ||
  /example|placeholder|xxx/i.test(value);

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "missing_api_key";
    throw err;
  }

  if (isInvalidApiKey(apiKey)) {
    const err = new Error(
      "GEMINI_API_KEY is still a placeholder. Get a free key at https://aistudio.google.com/apikey and add it to backend/.env"
    );
    err.code = "invalid_api_key_config";
    throw err;
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/** Map Gemini SDK errors to user-safe API messages */
const mapGeminiError = (error) => {
  if (error.code === "missing_api_key" || error.code === "invalid_api_key_config") {
    return error.message;
  }

  const msg = String(error.message || "");

  if (/API key not valid|API_KEY_INVALID|invalid.*api.*key/i.test(msg)) {
    return "Invalid Gemini API key. Update GEMINI_API_KEY in backend/.env and restart the backend.";
  }
  if (/quota|RESOURCE_EXHAUSTED|rate limit|429/i.test(msg)) {
    return "Gemini rate limit or quota reached. Try again later or check Google AI Studio quotas.";
  }
  if (/not found|404|model.*not/i.test(msg)) {
    return `Gemini model not found (${process.env.GEMINI_MODEL || DEFAULT_MODEL}). Check GEMINI_MODEL in backend/.env.`;
  }
  if (/SAFETY|blocked|block/i.test(msg)) {
    return "The message could not be processed due to safety filters. Please rephrase your question.";
  }

  return msg || "AI service temporarily unavailable. Please try again.";
};

const toGeminiRole = (role) => (role === "assistant" ? "model" : "user");

/**
 * @param {Array<{ role: string, content: string }>} history
 * @param {string} userMessage
 */
const createChatCompletion = async (history, userMessage) => {
  const client = getClient();
  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
    },
  });

  const geminiHistory = history.map((m) => ({
    role: toGeminiRole(m.role),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessage(userMessage);
  const reply = result?.response?.text?.();

  if (!reply?.trim()) {
    const err = new Error("Empty response from Gemini");
    err.code = "empty_response";
    throw err;
  }

  return reply.trim();
};

module.exports = {
  createChatCompletion,
  SYSTEM_PROMPT,
  mapGeminiError,
  isInvalidApiKey,
};
