import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Play,
  Loader2,
  Film,
  Calendar,
  Layers,
  RotateCw,
  Clipboard,
} from "lucide-react";
import { usePlaylistStore } from "../../store/playlistStore";
import { useVideoStore } from "../../store/videoStore";
import { useNotifyStore } from "../../store/notifyStore";
import { commands, Episode } from "../../types/bindings";
import { Tooltip } from "../ui/Tooltip";

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
  const { show } = useNotifyStore();

  const [inputUrl, setInputUrl] = useState(targetUrl);

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
      show(`Error: ${e}`, "error");
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
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#121212] border-r border-white/10 flex flex-col overflow-hidden shrink-0 z-20 shadow-[20px_0_40px_rgba(0,0,0,0.5)] select-none"
        >
          {/* Header & URL Input */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film size={16} className="text-[#facc15]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  Anime Playlist
                </span>
              </div>
              {playlist && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/20">
                  {playlist.episodes.length} EPS
                </span>
              )}
            </div>

            {/* Input & Load Bar */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 focus-within:border-[#facc15]/50 focus-within:ring-1 focus-within:ring-[#facc15]/30 transition-all">
              <input
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

          {/* Playlist Info & Episode List */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {playlist ? (
              <>
                <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between">
                  <h3
                    className="text-xs font-semibold text-gray-300 truncate pr-2"
                    title={playlist.title}
                  >
                    {playlist.title}
                  </h3>
                  <button
                    onClick={handleParse}
                    disabled={isParsing}
                    className="text-gray-400 hover:text-[#facc15] transition-colors p-1 cursor-pointer"
                    title="Reload"
                  >
                    <RotateCw size={12} className={isParsing ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
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
                            <span>{ep.published_at}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400">
                  <Layers size={22} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-300 mb-1">No Playlist Loaded</p>
                  <p className="text-[11px] text-gray-500 max-w-[220px] leading-relaxed">
                    Enter an Anime1 series URL above or paste from clipboard to load episodes.
                  </p>
                </div>
                <button
                  onClick={handlePasteFromClipboard}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2 border border-white/10 cursor-pointer shadow-sm"
                >
                  <Clipboard size={12} className="text-[#facc15]" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
