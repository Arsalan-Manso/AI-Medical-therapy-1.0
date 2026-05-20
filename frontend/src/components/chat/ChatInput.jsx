import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";

/**
 * Composer in centered column — left-aligned input like ChatGPT / Claude.
 */
const ChatInput = ({ disabled, isStreaming, onSend, onStop }) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend?.(trimmed);
    setValue("");
    requestAnimationFrame(resize);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div layout className="tw:w-full">
      <form
        onSubmit={handleSubmit}
        className="gpt-composer tw:flex tw:w-full tw:items-end tw:gap-1 tw:px-3 tw:py-2.5"
      >
        <button
          type="button"
          disabled
          className="gpt-icon-btn tw:mb-0.5 tw:shrink-0 tw:opacity-40"
          aria-label="Attach"
        >
          <Plus className="tw:h-5 tw:w-5" strokeWidth={2} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled && !isStreaming}
          placeholder="Message MedTherapy AI…"
          aria-label="Message"
          className="gpt-text tw:max-h-[200px] tw:min-h-[26px] tw:flex-1 tw:resize-none tw:bg-transparent tw:py-2.5 tw:text-left tw:text-base tw:leading-relaxed tw:outline-none placeholder:tw:text-[var(--gpt-text-muted)] disabled:tw:opacity-50"
        />

        <div className="tw:mb-0.5 tw:flex tw:shrink-0 tw:items-center tw:gap-1">
          {isStreaming ? (
            <button type="button" onClick={onStop} className="gpt-icon-btn" aria-label="Stop generating">
              <Square className="tw:h-4 tw:w-4 tw:fill-current" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="gpt-icon-btn tw:opacity-40"
                aria-label="Voice input"
              >
                <Mic className="tw:h-5 tw:w-5" strokeWidth={2} />
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: value.trim() && !disabled ? 1.05 : 1 }}
                whileTap={{ scale: 0.95 }}
                disabled={!value.trim() || disabled}
                className="gpt-send-btn"
                aria-label="Send message"
              >
                <ArrowUp className="tw:h-5 tw:w-5" strokeWidth={2.5} />
              </motion.button>
            </>
          )}
        </div>
      </form>

      <p className="gpt-text-muted tw:mt-2.5 tw:text-center tw:text-[11px] tw:leading-relaxed md:tw:text-xs">
        MedTherapy AI can make mistakes. Not a licensed medical professional — verify important health information.
      </p>
    </motion.div>
  );
};

export default ChatInput;
