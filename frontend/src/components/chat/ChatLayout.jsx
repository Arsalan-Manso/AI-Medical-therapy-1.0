import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import ChatHeader from "./ChatHeader";
import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import EmptyState from "./EmptyState";

const THEME_KEY = "ai-chat-theme";
const SIDEBAR_WIDTH = 260;

/**
 * ChatGPT-style: centered column on page, natural message alignment inside it.
 */
const ChatLayout = ({
  sessions,
  activeSession,
  isTyping,
  isStreaming,
  disabled,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onSend,
  onStop,
}) => {
  const { user } = useAuth();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(THEME_KEY);
    return stored ? stored === "dark" : true;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0 && !isTyping;

  useEffect(() => {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    document.documentElement.classList.toggle("ai-chat-dark", dark);
    return () => document.documentElement.classList.remove("ai-chat-dark");
  }, [dark]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (!isEmpty) {
      scrollToBottom(isStreaming ? "auto" : "smooth");
    }
  }, [messages, isTyping, isStreaming, isEmpty, scrollToBottom]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`ai-chat-shell tw:flex tw:h-[100dvh] tw:w-full tw:overflow-hidden ${dark ? "ai-chat-dark" : ""}`}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          className: dark
            ? "!tw:bg-[#2f2f2f] !tw:text-[#ececec] !tw:border !tw:border-white/10 !tw:shadow-xl"
            : "!tw:bg-white !tw:text-[#0d0d0d] !tw:border !tw:border-black/10 !tw:shadow-lg",
          duration: 2500,
        }}
      />

      <Sidebar
        open={sidebarOpen}
        width={SIDEBAR_WIDTH}
        sessions={sessions}
        activeSessionId={activeSession?.id}
        userName={user?.fullName || user?.name || user?.email?.split("@")[0] || "User"}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          onNewChat?.();
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
        onSelectSession={(id) => {
          onSelectSession?.(id);
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
        onDeleteSession={onDeleteSession}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="gpt-main tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col"
      >
        <ChatHeader
          dark={dark}
          sidebarOpen={sidebarOpen}
          sessionTitle={activeSession?.title}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleTheme={() => setDark((v) => !v)}
        />

        <main
          ref={scrollRef}
          className="ai-chat-scroll tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:overflow-y-auto"
          role="log"
          aria-live="polite"
        >
          <div className="chat-thread tw:mx-auto tw:flex tw:min-h-full tw:w-full tw:max-w-3xl tw:flex-col tw:px-4 md:tw:px-6">
            {/* Messages — top-aligned when active; vertically centered welcome when empty */}
            <div
              className={
                isEmpty
                  ? "tw:flex tw:flex-1 tw:flex-col tw:justify-center tw:py-10 md:tw:py-14"
                  : "tw:flex-1 tw:py-6 md:tw:py-8"
              }
            >
              {isEmpty ? (
                <EmptyState onSuggestionClick={(text) => onSend?.(text)} />
              ) : (
                <div className="chat-messages">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} className="tw:h-2" aria-hidden />
                </div>
              )}
            </div>

            {/* Composer — same centered column, natural left-aligned input */}
            <div className="chat-composer-panel tw:sticky tw:bottom-0 tw:z-10 tw:shrink-0 tw:pb-5 tw:pt-3">
              <ChatInput
                disabled={disabled}
                isStreaming={isStreaming}
                onSend={onSend}
                onStop={onStop}
              />
            </div>
          </div>
        </main>
      </motion.div>
    </motion.div>
  );
};

export default ChatLayout;
