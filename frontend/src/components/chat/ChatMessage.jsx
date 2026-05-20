import { memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import MessageActions from "./MessageActions";

const messageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Natural chat alignment: user right, assistant left — inside centered column.
 */
const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  const isStreaming = message.streaming && !isUser;

  if (isUser) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={messageVariants}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="tw:mb-5 tw:flex tw:w-full tw:justify-end"
      >
        <motion.div className="gpt-user-bubble tw:max-w-[85%] tw:text-left tw:text-[15px] tw:leading-relaxed tw:whitespace-pre-wrap">
          {message.content}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.article
      initial="hidden"
      animate="visible"
      variants={messageVariants}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="tw:group tw:mb-7 tw:flex tw:w-full tw:gap-3 md:tw:gap-4"
    >
      <div
        className="tw:mt-0.5 tw:flex tw:h-8 tw:w-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border gpt-border"
        style={{ background: "var(--gpt-surface)" }}
        aria-hidden
      >
        <Sparkles className="tw:h-4 tw:w-4 gpt-text-secondary" strokeWidth={1.75} />
      </div>

      <div className="tw:min-w-0 tw:flex-1">
        <div className="chat-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, children, ...props }) {
                const text = String(children).replace(/\n$/, "");
                if (inline) {
                  return (
                    <code
                      className="tw:rounded-md tw:border gpt-border tw:bg-[var(--gpt-code-bg)] tw:px-1.5 tw:py-0.5 tw:text-[14px] tw:font-mono"
                      {...props}
                    >
                      {text}
                    </code>
                  );
                }
                return (
                  <pre className="gpt-code-block tw:my-4">
                    <code className="tw:text-[14px]" {...props}>
                      {text}
                    </code>
                  </pre>
                );
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tw:text-[var(--gpt-text)] tw:underline tw:underline-offset-2"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content || ""}
          </ReactMarkdown>
          {isStreaming && (
            <span className="tw:ml-0.5 tw:inline-block tw:h-4 tw:w-0.5 tw:animate-pulse tw:bg-[var(--gpt-text-muted)]" />
          )}
        </div>

        {!isStreaming && message.content && <MessageActions content={message.content} />}
      </div>
    </motion.article>
  );
};

export default memo(ChatMessage);
