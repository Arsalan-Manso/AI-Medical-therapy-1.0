import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { api, authHeader } from "../utils/api";
import ChatLayout from "../components/chat/ChatLayout";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const mapSessionFromApi = (session, messages = []) => ({
  id: session.id,
  title: session.title || "New conversation",
  createdAt: new Date(session.createdAt),
  messages: messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
  })),
});

/**
 * AI therapy chat — Google Gemini via POST /api/chat, sessions stored in MongoDB.
 */
const AIChatPage = () => {
  const { isAuthenticated, token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const streamAbortRef = useRef(false);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? null;

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/chat/sessions", authHeader(token));
      const list = (data.sessions || []).map((s) => mapSessionFromApi(s, []));
      setSessions(list);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Could not load chat history");
    } finally {
      setLoadingSessions(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadSessions();
    } else {
      setLoadingSessions(false);
    }
  }, [isAuthenticated, token, loadSessions]);

  const appendMessage = useCallback((sessionId, message) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
      )
    );
  }, []);

  const updateMessage = useCallback((sessionId, messageId, patch) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m
              ),
            }
          : s
      )
    );
  }, []);

  const upsertSession = useCallback((sessionPayload, messages) => {
    const mapped = mapSessionFromApi(sessionPayload, messages);
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === mapped.id);
      if (exists) {
        return prev.map((s) => (s.id === mapped.id ? mapped : s));
      }
      return [mapped, ...prev];
    });
    setActiveSessionId(mapped.id);
    return mapped.id;
  }, []);

  const simulateStream = useCallback(
    async (sessionId, assistantId, fullText) => {
      streamAbortRef.current = false;
      setIsStreaming(true);
      setIsTyping(false);

      const chunkSize = 4;
      const delayMs = 16;

      for (let i = 0; i < fullText.length; i += chunkSize) {
        if (streamAbortRef.current) break;
        updateMessage(sessionId, assistantId, {
          content: fullText.slice(0, i + chunkSize),
          streaming: true,
        });
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }

      updateMessage(sessionId, assistantId, {
        content: fullText,
        streaming: false,
      });
      setIsStreaming(false);
    },
    [updateMessage]
  );

  const handleSend = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !token) return;

      let sessionId = activeSessionId;

      const optimisticUser = {
        id: uid(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      if (sessionId) {
        appendMessage(sessionId, optimisticUser);
      }

      setIsTyping(true);

      try {
        const { data } = await api.post(
          "/chat",
          {
            message: trimmed,
            sessionId: sessionId || undefined,
          },
          authHeader(token)
        );

        const resolvedId = data.session?.id;
        if (!resolvedId) {
          throw new Error("Invalid server response");
        }

        if (!sessionId) {
          upsertSession(data.session, [data.userMessage]);
          sessionId = resolvedId;
        } else {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    title: data.session?.title || s.title,
                    messages: s.messages.some((m) => m.id === data.userMessage?.id)
                      ? s.messages
                      : [
                          ...s.messages.filter((m) => m.id !== optimisticUser.id),
                          {
                            id: data.userMessage.id,
                            role: "user",
                            content: data.userMessage.content,
                            timestamp: new Date(data.userMessage.timestamp),
                          },
                        ],
                  }
                : s
            )
          );
        }

        const assistantId = data.assistantMessage?.id || uid();
        appendMessage(sessionId, {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(data.assistantMessage?.timestamp || Date.now()),
          streaming: true,
        });

        await simulateStream(sessionId, assistantId, data.reply || "");
      } catch (err) {
        console.error(err);
        const msg =
          err.response?.data?.message ||
          "Failed to get a response. Check your connection and API key.";
        toast.error(msg);

        if (sessionId) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: s.messages.filter(
                      (m) => m.id !== optimisticUser.id
                    ),
                  }
                : s
            )
          );
        }
        setIsTyping(false);
        setIsStreaming(false);
      }
    },
    [
      activeSessionId,
      appendMessage,
      isStreaming,
      simulateStream,
      token,
      upsertSession,
    ]
  );

  const handleStop = useCallback(() => {
    streamAbortRef.current = true;
    setIsStreaming(false);
    setIsTyping(false);
    toast("Generation stopped");
  }, []);

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      toast.error("Wait for the current response to finish");
      return;
    }
    setActiveSessionId(null);
  }, [isStreaming]);

  const handleSelectSession = useCallback(
    async (id) => {
      if (isStreaming) {
        toast.error("Wait for the current response to finish");
        return;
      }
      setActiveSessionId(id);

      const cached = sessions.find((s) => s.id === id);
      if (cached?.messages?.length > 0) return;

      try {
        const { data } = await api.get(`/chat/sessions/${id}`, authHeader(token));
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? mapSessionFromApi(data.session, data.messages || [])
              : s
          )
        );
      } catch (err) {
        toast.error(err.response?.data?.message || "Could not load conversation");
      }
    },
    [isStreaming, sessions, token]
  );

  const handleDeleteSession = useCallback(
    async (id) => {
      if (isStreaming) {
        toast.error("Wait for the current response to finish");
        return;
      }
      try {
        await api.delete(`/chat/sessions/${id}`, authHeader(token));
        setSessions((prev) => {
          const next = prev.filter((s) => s.id !== id);
          if (activeSessionId === id) {
            setActiveSessionId(next[0]?.id ?? null);
          }
          return next;
        });
        toast.success("Chat deleted");
      } catch (err) {
        toast.error(err.response?.data?.message || "Could not delete chat");
      }
    },
    [activeSessionId, isStreaming, token]
  );

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/patient/login"
        replace
        state={{ from: { pathname: "/ai-chat" } }}
      />
    );
  }

  if (loadingSessions) {
    return (
      <div className="ai-chat-shell ai-chat-dark tw:flex tw:h-[100dvh] tw:items-center tw:justify-center gpt-main">
        <p className="gpt-text-muted tw:text-sm">Loading chats…</p>
      </div>
    );
  }

  return (
    <ChatLayout
      sessions={sessions}
      activeSession={activeSession}
      isTyping={isTyping && !isStreaming}
      isStreaming={isStreaming}
      disabled={isTyping}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
      onSend={handleSend}
      onStop={handleStop}
    />
  );
};

export default AIChatPage;
