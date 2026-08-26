"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/15 px-3 py-2 text-xs text-amber-200"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={13} className="shrink-0" />
          You&apos;re offline — chats are saved locally, but LLM replies need a connection.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
