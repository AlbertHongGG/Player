import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, History } from "lucide-react";
import { usePlaylistStore } from "../../store/playlistStore.ts";
import { useUiStore } from "../../store/uiStore.ts";
import { useHistoryCount } from "../../store/historyStore.ts";
import { CleanUrlInput, CleanUrlInputHandle } from "../common/CleanUrlInput.tsx";
import { PlayableUrl } from "../../domain/url/PlayableUrl.ts";
import { EpisodeListView } from "./sidebar/EpisodeListView.tsx";
import { HistoryListView } from "./sidebar/HistoryListView.tsx";

export const PlaylistSidebar: React.FC = () => {
  const {
    targetUrl,
    playlist,
    isParsing,
    loadPlaylist,
  } = usePlaylistStore();

  const { isSidebarOpen, isImmersive, sidebarTab, setSidebarTab } = useUiStore();
  const historyCount = useHistoryCount();
  const inputRef = useRef<CleanUrlInputHandle>(null);

  const handleFocusInput = () => {
    inputRef.current?.focus();
  };

  const handleLoadUrl = async (url: PlayableUrl) => {
    await loadPlaylist(url);
    setSidebarTab("playlist");
  };

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* Subtle click-outside backdrop in immersive mode */}
          {isImmersive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
              onClick={() => useUiStore.getState().toggleSidebar()}
            />
          )}

          <motion.div
            initial={isImmersive ? { x: 340, opacity: 0 } : { width: 0, opacity: 0 }}
            animate={isImmersive ? { x: 0, opacity: 1 } : { width: 340, opacity: 1 }}
            exit={isImmersive ? { x: 340, opacity: 0 } : { width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={
              isImmersive
                ? "absolute top-0 right-0 h-full w-[340px] bg-[#121212]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden z-50 select-none"
                : "h-full bg-[#121212] border-l border-white/10 flex flex-col overflow-hidden shrink-0 z-30 select-none"
            }
          >
            {/* Header: Segmented Tabs & Clean URL Input */}
            <div className="p-3 border-b border-white/5 space-y-2.5 shrink-0 bg-[#0d0d0d]/40">
              {/* Segmented Tab Controller */}
              <div className="flex items-center p-0.5 bg-[#181818] border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSidebarTab("playlist")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sidebarTab === "playlist"
                      ? "bg-[#242424] text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Film size={13} className={sidebarTab === "playlist" ? "text-[#facc15]" : ""} />
                  <span>當前播放</span>
                  {playlist && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/20">
                      {playlist.episodes.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab("history")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sidebarTab === "history"
                      ? "bg-[#242424] text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <History size={13} className={sidebarTab === "history" ? "text-[#facc15]" : ""} />
                  <span>觀看歷史</span>
                  {historyCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300">
                      {historyCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Clean URL Input & Load Bar */}
              <CleanUrlInput
                ref={inputRef}
                value={targetUrl}
                isLoading={isParsing}
                onSubmit={handleLoadUrl}
              />
            </div>

            {/* Sub-view Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {sidebarTab === "playlist" ? (
                <EpisodeListView onFocusInput={handleFocusInput} />
              ) : (
                <HistoryListView />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
