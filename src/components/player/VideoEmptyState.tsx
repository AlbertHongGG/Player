import React from "react";
import { motion } from "framer-motion";
import { Film, Play } from "lucide-react";
import { useUiStore } from "../../store/uiStore";

export const VideoEmptyState: React.FC = () => {
  const { setSidebarOpen } = useUiStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-black/40 select-none">
      <motion.button
        onClick={() => setSidebarOpen(true)}
        className="group relative flex flex-col items-center justify-center focus:outline-none cursor-pointer"
        whileHover="hover"
        whileTap="tap"
        initial="initial"
      >
        {/* Glowing Circle Icon Container */}
        <motion.div
          className="relative flex items-center justify-center w-28 h-28 rounded-full bg-[#111111] border border-white/5 shadow-2xl mb-8 transition-colors duration-300 group-hover:bg-[#161616]"
          variants={{
            initial: { scale: 1, boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" },
            hover: {
              scale: 1.05,
              boxShadow:
                "0px 20px 40px rgba(0,0,0,0.6), 0px 0px 0px 1px rgba(250,204,21,0.4), 0px 0px 30px rgba(250,204,21,0.25)",
            },
            tap: { scale: 0.95 },
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div
            variants={{
              initial: { y: 0 },
              hover: { y: -4 },
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Film
              size={44}
              strokeWidth={2}
              className="text-gray-400 group-hover:text-[#facc15] transition-colors duration-300 drop-shadow-md group-hover:drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]"
            />
          </motion.div>
        </motion.div>

        {/* Text Details */}
        <div className="flex flex-col items-center pointer-events-none">
          <motion.h2
            className="text-3xl font-bold mb-4 text-white tracking-tight drop-shadow-md"
            variants={{
              initial: { opacity: 0.9 },
              hover: { opacity: 1, textShadow: "0px 0px 12px rgba(255,255,255,0.4)" },
            }}
          >
            Ready to Play Anime
          </motion.h2>
          <motion.p
            className="text-sm text-gray-400 tracking-[0.2em] uppercase font-semibold"
            variants={{
              initial: { opacity: 0.6 },
              hover: { opacity: 0.9 },
            }}
          >
            Dedicated Streaming Player for Anime1.me
          </motion.p>

          <motion.div
            className="text-xs text-[#facc15]/90 mt-6 tracking-widest font-bold uppercase flex items-center gap-1.5"
            variants={{
              initial: { opacity: 0, y: 10 },
              hover: { opacity: 1, y: 0 },
            }}
          >
            <Play size={12} className="fill-current" />
            <span>Open Playlist Sidebar to Select Episode</span>
          </motion.div>
        </div>
      </motion.button>
    </div>
  );
};
