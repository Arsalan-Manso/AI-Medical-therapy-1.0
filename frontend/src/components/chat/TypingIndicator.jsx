import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/** Matches assistant message row — avatar left, content left. */
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="tw:mb-7 tw:flex tw:w-full tw:gap-3 md:tw:gap-4"
  >
    <motion.div
      className="tw:mt-0.5 tw:flex tw:h-8 tw:w-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border gpt-border"
      style={{ background: "var(--gpt-surface)" }}
    >
      <Sparkles className="tw:h-4 tw:w-4 gpt-text-secondary" strokeWidth={1.75} />
    </motion.div>
    <motion.div className="tw:flex tw:items-center tw:gap-1.5 tw:py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="tw:h-2 tw:w-2 tw:rounded-full"
          style={{ background: "var(--gpt-text-muted)" }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </motion.div>
  </motion.div>
);

export default TypingIndicator;
