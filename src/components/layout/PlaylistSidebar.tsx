import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Play,
  Loader2,
  Film,
  Calendar,
  Clipboard,
} from "lucide-react";
import { usePlaylistStore } from "../../store/playlistStore";
import { useVideoStore } from "../../store/videoStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useNotifyStore } from "../../store/notifyStore";
import { commands, Episode } from "../../types/bindings";
import { Tooltip } from "../ui/Tooltip";
import { formatDateTime } from "../../utils/time";

export const PlaylistSidebar: React.FC = () => {
  const {
    targetUrl,
    playlist,
    selectedEpisodeId,
    isSidebarOpen,
    isParsing,
    setTargetUrl,
    setPlaylist,
    selectEpisode,
    setIsParsing,
  } = usePlaylistStore();

  const { setVideoUrl, setIsLoadingStream, setIsPlaying } = useVideoStore();
  const { isImmersive } = useSettingsStore();
  const { show } = useNotifyStore();

  const [inputUrl, setInputUrl] = useState(targetUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocusInput = () => {
    inputRef.current?.focus();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed.includes("anime1.me")) {
        setInputUrl(trimmed);
        show("Pasted Anime1 URL from clipboard", "success");
      } else if (trimmed) {
        setInputUrl(trimmed);
        show("Pasted text from clipboard", "info");
      } else {
        show("Clipboard is empty", "warning");
      }
    } catch (err) {
      console.warn("Clipboard read failed:", err);
      show("Please allow clipboard permissions or paste manually", "warning");
    }
  };

  const handleParse = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      show("Please enter an Anime1 URL", "warning");
      return;
    }

    setIsParsing(true);
    try {
      const result = await commands.parseUrl(trimmed);
      if (result.status === "ok") {
        setTargetUrl(trimmed);
        setPlaylist(result.data);
        show(`Loaded "${result.data.title}" (${result.data.episodes.length} episodes)`, "success");

        // Automatically select and load the first episode if none selected
        if (result.data.episodes.length > 0) {
          handleSelectEpisode(result.data.episodes[0]);
        }
      } else {
        show(`Failed to parse URL: ${result.error}`, "error");
      }
    } catch (e) {
      console.error("Parse URL error:", e);
      show(`Error parsing URL: ${e}`, "error");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectEpisode = async (episode: Episode) => {
    selectEpisode(episode.id);
    setIsLoadingStream(true);

    try {
      const res = await commands.resolveEpisode(episode.provider_id, episode.id);
      if (res.status === "ok") {
        setVideoUrl(res.data.stream_url, episode.title);
        setIsPlaying(true);
        show(`Playing: ${episode.title}`, "success");
        if (isImmersive) {
          usePlaylistStore.getState().toggleSidebar();
        }
      } else {
        show(`Failed to resolve episode: ${res.error}`, "error");
      }
    } catch (e) {
      console.error("Resolve episode error:", e);
      show(`Error resolving episode: ${e}`, "error");
    } finally {
      setIsLoadingStream(false);
    }
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
              onClick={() => usePlaylistStore.getState().toggleSidebar()}
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
          {/* Header & URL Input */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <Film size={16} className="text-[#facc15] shrink-0" />
                <span
                  className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate"
                  title={playlist?.title || "Anime Playlist"}
                >
                  {playlist ? playlist.title : "Anime Playlist"}
                </span>
              </div>
              {playlist && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/20 shrink-0">
                  {playlist.episodes.length} EPS
                </span>
              )}
            </div>

            {/* Input & Load Bar */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 focus-within:border-[#facc15]/50 focus-within:ring-1 focus-within:ring-[#facc15]/30 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleParse();
                }}
                placeholder="Enter or paste Anime1 URL..."
                className="w-full bg-transparent text-xs text-white placeholder-gray-500 px-2.5 py-1.5 focus:outline-none"
              />

              <Tooltip content="Paste from Clipboard" position="bottom">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all shrink-0 cursor-pointer"
                >
                  <Clipboard size={13} />
                </button>
              </Tooltip>

              <Tooltip content="Load Playlist" position="bottom">
                <button
                  onClick={handleParse}
                  disabled={isParsing}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#facc15] hover:bg-white text-black transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isParsing ? (
                    <Loader2 size={13} className="animate-spin text-black" />
                  ) : (
                    <Search size={13} strokeWidth={2.5} />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Episode List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {playlist ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-12 space-y-1.5">
                  {playlist.episodes.map((ep, idx) => {
                    const isSelected = selectedEpisodeId === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleSelectEpisode(ep)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 border flex flex-col gap-1 group relative cursor-pointer ${
                          isSelected
                            ? "bg-[#facc15]/10 border-[#facc15]/40 text-white shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                            : "bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.06] hover:border-white/15"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-[#facc15] text-black"
                                  : "bg-white/10 text-gray-400 group-hover:text-white"
                              }`}
                            >
                              {isSelected ? (
                                <Play size={11} className="fill-current ml-0.5" />
                              ) : (
                                <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium truncate ${
                                isSelected ? "text-[#facc15] font-semibold" : ""
                              }`}
                              title={ep.title}
                            >
                              {ep.title}
                            </span>
                          </div>
                        </div>

                        {ep.published_at && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 pl-8">
                            <Calendar size={10} />
                            <span>{formatDateTime(ep.published_at)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
            ) : (
              <div
                onClick={handleFocusInput}
                className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer group"
              >
                {/* Concentric Multi-layered Interactive Container */}
                <div className="relative mb-6 flex items-center justify-center">
                  {/* Layer 1: Ambient Background Glow with smooth expansion */}
                  <div className="absolute inset-0 w-32 h-32 rounded-full bg-[#facc15]/5 blur-2xl scale-90 opacity-40 group-hover:bg-[#facc15]/15 group-hover:scale-115 group-hover:opacity-80 transition-all duration-500 ease-out pointer-events-none" />

                  {/* Layer 2: Subtle Sub-orbital Ring */}
                  <div className="w-28 h-28 rounded-full border border-white/[0.03] group-hover:border-[#facc15]/10 absolute transition-colors duration-500 pointer-events-none" />

                  {/* Layer 3: Orbiting Dashed Ring with scale and golden resonance */}
                  <div className="w-32 h-32 rounded-full border border-dashed border-white/10 group-hover:border-[#facc15]/30 group-hover:scale-105 flex items-center justify-center relative animate-[spin_35s_linear_infinite] transition-all duration-500 ease-out pointer-events-none" />

                  {/* Layer 4: Frosted Core Glass Badge with elevation and inner aura */}
                  <div className="w-20 h-20 rounded-full bg-[#131313]/90 border border-white/10 group-hover:border-[#facc15]/40 group-hover:scale-105 group-hover:bg-[#181818] shadow-[0_4px_24px_rgba(0,0,0,0.7)] group-hover:shadow-[0_0_25px_rgba(250,204,21,0.2)] flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-md transition-all duration-300 ease-out">
                    {/* Layer 5: Glowing Golden Accent Icon */}
                    <Film
                      size={28}
                      className="text-[#facc15] opacity-75 group-hover:opacity-100 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(250,204,21,0.75)] transition-all duration-300 ease-out"
                    />
                  </div>
                </div>

                {/* Layer 6: Dynamic Tracking Typography */}
                <span className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase group-hover:text-gray-300 group-hover:tracking-[0.35em] transition-all duration-300">
                  NO PLAYLIST
                </span>
              </div>
            )}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
