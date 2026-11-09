import React from "react";
import { Play, Calendar, Film, CheckCircle2 } from "lucide-react";
import { usePlaylistStore, Episode } from "../../../store/playlistStore.ts";
import { useHistoryItem } from "../../../store/historyStore.ts";
import { useUiStore } from "../../../store/uiStore.ts";
import { useNotifyStore } from "../../../store/notifyStore.ts";
import { PlayableUrl } from "../../../domain/url/PlayableUrl.ts";
import { formatDateTime } from "../../../utils/time.ts";
import { SidebarEmptyState } from "./SidebarEmptyState.tsx";

interface EpisodeListViewProps {
  onFocusInput: () => void;
}

export const EpisodeListView: React.FC<EpisodeListViewProps> = ({ onFocusInput }) => {
  const { playlist, selectedEpisodeId, playEpisode } = usePlaylistStore();
  const { isImmersive } = useUiStore();
  const { show } = useNotifyStore();

  const canonicalUrl = playlist ? PlayableUrl.parse(playlist.url).wireUrl : "";
  // Pure, stable subscription to this specific anime's history record
  const historyEntry = useHistoryItem(canonicalUrl);

  const handleSelectEpisode = async (episode: Episode) => {
    await playEpisode(episode);
    show(`Playing: ${episode.title}`, "success");
    if (isImmersive) {
      useUiStore.getState().toggleSidebar();
    }
  };

  if (!playlist) {
    return (
      <SidebarEmptyState
        icon={Film}
        title="NO PLAYLIST"
        onClick={onFocusInput}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-12 space-y-1.5">
      {playlist.episodes.map((ep, idx) => {
        const isSelected = selectedEpisodeId === ep.id;
        const epProgress = historyEntry?.episodeProgressMap[ep.id];
        const isCompleted = epProgress?.isCompleted ?? false;
        const percentage = epProgress?.percentage ?? 0;

        return (
          <button
            key={ep.id}
            onClick={() => handleSelectEpisode(ep)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 border flex flex-col gap-1.5 group relative cursor-pointer overflow-hidden ${
              isSelected
                ? "bg-[#facc15]/10 border-[#facc15]/40 text-white shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                : "bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.06] hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#facc15] text-black"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/10 text-gray-400 group-hover:text-white"
                  }`}
                >
                  {isSelected ? (
                    <Play size={11} className="fill-current ml-0.5" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={12} />
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

              {isCompleted ? (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  已看過
                </span>
              ) : percentage > 0 ? (
                <span className="text-[9px] font-mono font-medium text-gray-400 shrink-0">
                  {percentage}%
                </span>
              ) : null}
            </div>

            {ep.published_at && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500 pl-8">
                <Calendar size={10} />
                <span>{formatDateTime(ep.published_at)}</span>
              </div>
            )}

            {/* In-progress mini bottom bar */}
            {!isCompleted && percentage > 0 && (
              <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden mt-0.5">
                <div
                  className="bg-[#facc15]/80 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
