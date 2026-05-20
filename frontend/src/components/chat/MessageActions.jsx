import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Action row under assistant messages — fades in on hover.
 */
const MessageActions = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const buttons = [
    {
      key: "copy",
      label: copied ? "Copied" : "Copy",
      onClick: handleCopy,
      icon: copied ? Check : Copy,
    },
    { key: "up", label: "Good response", icon: ThumbsUp },
    { key: "down", label: "Bad response", icon: ThumbsDown },
    { key: "regen", label: "Regenerate", icon: RotateCcw },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="tw:mt-3 tw:flex tw:items-center tw:gap-0.5 tw:opacity-70 tw:transition-opacity group-hover:tw:opacity-100"
    >
      {buttons.map(({ key, label, onClick, icon: Icon }) => (
        <motion.button
          key={key}
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={onClick}
          className="gpt-icon-btn tw:h-8 tw:w-8"
          aria-label={label}
        >
          <Icon className="tw:h-4 tw:w-4" strokeWidth={1.75} />
        </motion.button>
      ))}
    </motion.div>
  );
};

export default MessageActions;
