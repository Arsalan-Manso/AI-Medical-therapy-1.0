import { motion } from "framer-motion";
import { HeartPulse, Moon, Sparkles, Stethoscope } from "lucide-react";

const SUGGESTIONS = [
  { icon: HeartPulse, text: "What are healthy ways to manage stress?" },
  { icon: Sparkles, text: "Explain mindfulness for anxiety relief" },
  { icon: Moon, text: "How can I improve my sleep hygiene?" },
  { icon: Stethoscope, text: "What should I know before starting therapy?" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

/**
 * Empty chat welcome — centered in column; suggestions left-aligned for readability.
 */
const EmptyState = ({ onSuggestionClick }) => (
  <motion.div
    variants={container}
    initial="hidden"
    animate="show"
    className="tw:w-full"
  >
    <motion.div variants={item} className="tw:mb-8 tw:text-center">
      <div
        className="tw:mx-auto tw:mb-5 tw:flex tw:h-12 tw:w-12 tw:items-center tw:justify-center tw:rounded-2xl tw:border gpt-border"
        style={{ background: "var(--gpt-surface)" }}
      >
        <Sparkles className="tw:h-6 tw:w-6 gpt-text-secondary" strokeWidth={1.5} />
      </div>
      <h1 className="gpt-text tw:mb-2 tw:text-2xl tw:font-semibold tw:tracking-tight md:tw:text-[1.75rem]">
        How can I help you today?
      </h1>
      <p className="gpt-text-muted tw:mx-auto tw:max-w-sm tw:text-sm md:tw:text-[15px]">
        Ask about wellness, therapy, sleep, or stress. I&apos;m here to help — not replace your doctor.
      </p>
    </motion.div>

    <motion.ul variants={container} className="tw:flex tw:flex-col tw:gap-2">
      {SUGGESTIONS.map(({ icon: Icon, text }) => (
        <motion.li key={text} variants={item}>
          <button
            type="button"
            onClick={() => onSuggestionClick?.(text)}
            className="gpt-text gpt-nav-btn tw:w-full tw:rounded-xl tw:border gpt-border tw:px-4 tw:py-3.5 tw:text-left tw:text-sm"
            style={{ background: "var(--gpt-surface)" }}
          >
            <Icon className="tw:mr-3 tw:inline tw:h-4 tw:w-4 tw:align-text-bottom gpt-text-secondary" strokeWidth={1.75} />
            {text}
          </button>
        </motion.li>
      ))}
    </motion.ul>
  </motion.div>
);

export default EmptyState;
