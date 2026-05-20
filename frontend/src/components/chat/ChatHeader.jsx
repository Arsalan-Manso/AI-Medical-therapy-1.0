import { motion } from "framer-motion";
import { ChevronDown, Menu, Moon, PanelLeftOpen, Share2, Sun } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Sticky glass header with sidebar toggle and model label.
 */
const ChatHeader = ({
  dark,
  sidebarOpen,
  sessionTitle,
  onToggleSidebar,
  onToggleTheme,
}) => (
  <header className="gpt-glass tw:sticky tw:top-0 tw:z-30 tw:flex tw:h-14 tw:shrink-0 tw:items-center tw:justify-between tw:border-b gpt-border tw:px-3 md:tw:px-4">
    <motion.div
      layout
      className="tw:flex tw:min-w-0 tw:flex-1 tw:items-center tw:gap-2"
    >
      {!sidebarOpen && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onToggleSidebar}
          className="gpt-icon-btn"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="tw:hidden tw:h-5 tw:w-5 lg:tw:block" />
          <Menu className="tw:h-5 tw:w-5 lg:tw:hidden" />
        </motion.button>
      )}

      <button
        type="button"
        className="gpt-text tw:flex tw:max-w-[min(100%,280px)] tw:items-center tw:gap-1.5 tw:truncate tw:rounded-xl tw:px-2.5 tw:py-2 tw:text-base tw:font-semibold tw:transition-colors hover:tw:bg-[var(--gpt-hover)] md:tw:text-lg"
      >
        <span className="tw:truncate">MedTherapy AI</span>
        <ChevronDown className="tw:h-4 tw:w-4 tw:shrink-0 gpt-text-secondary" strokeWidth={2} />
      </button>

      {sessionTitle && sessionTitle !== "New chat" && (
        <span className="gpt-text-muted tw:hidden tw:truncate tw:text-sm md:tw:inline">
          · {sessionTitle}
        </span>
      )}
    </motion.div>

    <div className="tw:flex tw:items-center tw:gap-0.5">
      <button type="button" className="gpt-icon-btn" title="Share" aria-label="Share">
        <Share2 className="tw:h-[18px] tw:w-[18px]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        className="gpt-icon-btn"
        aria-label="Toggle theme"
      >
        {dark ? (
          <Sun className="tw:h-[18px] tw:w-[18px]" />
        ) : (
          <Moon className="tw:h-[18px] tw:w-[18px]" />
        )}
      </button>
      <Link
        to="/patient/dashboard"
        className="gpt-text-secondary tw:hidden tw:rounded-xl tw:px-3 tw:py-2 tw:text-sm tw:font-medium tw:transition-colors hover:tw:bg-[var(--gpt-hover)] sm:tw:inline-block"
      >
        Dashboard
      </Link>
    </div>
  </header>
);

export default ChatHeader;
