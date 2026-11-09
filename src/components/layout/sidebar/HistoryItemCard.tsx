import React from "react";
import { Play, Trash2, CheckCircle2 } from "lucide-react";
import { useHistoryItem } from "../../../store/historyStore.ts";
import { Tooltip } from "../../ui/Tooltip.tsx";
import { formatRelativeTime, formatTime } from "../../../utils/time.ts";

interface HistoryItemCardProps {
  canonicalUrl: string;
  onSelect: (canonicalUrl: string, lastEpisodeId?: string) => void;
  onDelete: (e: React.MouseEvent, canonicalUrl: string, title: string) => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = React.memo(({
  canonicalUrl,
  onSelect,
  onDelete,
}) => {
  const item = useHistoryItem(canonicalUrl);
  if (!item) return null;

  const lastProgress = item.lastEpisodeId
    ? item.episodeProgressMap[item.lastEpisodeId]
    : undefined;

  const isCompleted = lastProgress?.isCompleted ?? false;
  const percentage = lastProgress?.percentage ?? 0;

  return (
    <div
      onClick={() => onSelect(item.canonicalUrl, item.lastEpisodeId)}
      className="w-full text-left p-3 rounded-xl transition-all duration-200 border bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.06] hover:border-white/15 group relative cursor-pointer flex flex-col gap-2"
    >
      {/* Header: Title, Episode Count & Delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4
            className="text-xs font-semibold text-gray-200 group-hover:text-white truncate transition-colors"
            title={item.title}
          >
            {item.title}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
            {item.lastEpisodeTitle ? (
              <span className="truncate max-w-[140px] text-gray-300">
                {item.lastEpisodeTitle}
              </span>
            ) : (
              <span>未開始觀看</span>
            )}
            <span>•</span>
            <span className="shrink-0">{formatRelativeTime(item.lastWatchedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {item.totalEpisodes > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
              {item.totalEpisodes} EPS
            </span>
          )}

          <Tooltip content="刪除此紀錄" position="left">
            <button
              type="button"
              onClick={(e) => onDelete(e, item.canonicalUrl, item.title)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          {isCompleted ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 size={11} />
              <span>已完播</span>
            </span>
          ) : percentage > 0 ? (
            <span className="text-gray-400 font-mono">
              進度 {percentage}%
              {lastProgress && ` (${formatTime(lastProgress.position)})`}
            </span>
          ) : (
            <span className="text-gray-500">未開始播放</span>
          )}

          <span className="text-[#facc15] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[10px] font-medium">
            <Play size={10} className="fill-current" />
            <span>繼續播放</span>
          </span>
        </div>

        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted ? "bg-emerald-500" : "bg-[#facc15]"
            }`}
            style={{ width: `${isCompleted ? 100 : percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
});

HistoryItemCard.displayName = "HistoryItemCard";
