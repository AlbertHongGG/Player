import React from "react";
import { useNotifyStore } from "../../store/notifyStore";
import { AnimatePresence, motion } from "framer-motion";

export const Notify: React.FC = () => {
  const { message, type } = useNotifyStore();

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className="fixed top-12 left-1/2 z-50 px-4 py-2 rounded-lg shadow-lg glass-panel flex items-center gap-2"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              type === "success"
                ? "bg-green-500"
                : type === "error"
                ? "bg-red-500"
                : type === "warning"
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
          />
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
