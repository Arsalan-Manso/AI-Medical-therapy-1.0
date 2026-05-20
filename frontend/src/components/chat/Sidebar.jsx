import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquarePlus,
  PanelLeftClose,
  Search,
  Trash2,
} from "lucide-react";

const sidebarTransition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] };

/**
 * Fixed ChatGPT-style sidebar with collapse animation (desktop) + drawer (mobile).
 */
const Sidebar = ({
  open,
  width = 260,
  sessions,
  activeSessionId,
  userName,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onToggleSidebar,
}) => {
  const initial = userName?.charAt(0)?.toUpperCase() || "U";

  const panel = (
    <aside
      className="gpt-sidebar tw:flex tw:h-full tw:flex-col tw:border-r gpt-border"
      style={{ width }}
    >
      <div className="tw:flex tw:flex-col tw:gap-0.5 tw:p-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onToggleSidebar}
          className="gpt-nav-btn"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="tw:h-[18px] tw:w-[18px] tw:shrink-0" strokeWidth={1.75} />
          <span className="tw:lg:tw-hidden">Close menu</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onNewChat}
          className="gpt-nav-btn"
        >
          <MessageSquarePlus className="tw:h-[18px] tw:w-[18px] tw:shrink-0" strokeWidth={1.75} />
          New chat
        </motion.button>

        <button type="button" className="gpt-nav-btn tw:opacity-60" disabled title="Coming soon">
          <Search className="tw:h-[18px] tw:w-[18px] tw:shrink-0" strokeWidth={1.75} />
          Search chats
        </button>
      </div>

      <p className="gpt-text-muted tw:px-4 tw:pb-2 tw:pt-1 tw:text-[11px] tw:font-semibold tw:uppercase tw:tracking-wider">
        Your chats
      </p>

      <nav className="ai-chat-scroll tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:px-2 tw:pb-2" aria-label="Chat history">
        {sessions.length === 0 ? (
          <p className="gpt-text-muted tw:px-3 tw:py-6 tw:text-center tw:text-sm">
            No conversations yet
          </p>
        ) : (
          <ul className="tw:space-y-0.5">
            {sessions.map((session, i) => {
              const isActive = session.id === activeSessionId;
              return (
                <motion.li
                  key={session.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, ...sidebarTransition }}
                  className="tw:group tw:relative"
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(session.id)}
                    className={`gpt-session-btn ${isActive ? "is-active" : ""}`}
                  >
                    {session.title || "New chat"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession?.(session.id);
                    }}
                    aria-label="Delete chat"
                    className="gpt-icon-btn tw:absolute tw:right-0.5 tw:top-1/2 tw:h-8 tw:w-8 tw:-translate-y-1/2 tw:opacity-0 tw:transition-opacity group-hover:tw:opacity-100"
                  >
                    <Trash2 className="tw:h-3.5 tw:w-3.5" />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </nav>

      <motion.div className="tw:border-t gpt-border tw:p-2.5">
        <Link to="/patient/dashboard" className="gpt-nav-btn">
          <span className="tw:flex tw:h-8 tw:w-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-[var(--gpt-active)] tw:text-sm tw:font-semibold tw:text-white">
            {initial}
          </span>
          <span className="tw:min-w-0 tw:flex-1 tw:truncate">{userName}</span>
          <LayoutDashboard className="tw:ml-auto tw:h-4 tw:w-4 tw:opacity-50" />
        </Link>
      </motion.div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed width rail — main flex area grows/shrinks */}
      <motion.div
        className="tw:relative tw:hidden tw:h-full tw:shrink-0 tw:overflow-hidden lg:tw:block"
        initial={false}
        animate={{ width: open ? width : 0 }}
        transition={sidebarTransition}
      >
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key="sidebar-desktop"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
              className="tw:h-full"
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="tw:fixed tw:inset-0 tw:z-40 tw:bg-black/70 tw:backdrop-blur-sm lg:tw:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden
            />
            <motion.div
              className="tw:fixed tw:inset-y-0 tw:left-0 tw:z-50 tw:shadow-2xl lg:tw:hidden"
              initial={{ x: -width }}
              animate={{ x: 0 }}
              exit={{ x: -width }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {panel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
