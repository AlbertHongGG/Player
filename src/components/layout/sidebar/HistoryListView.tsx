import React, { useState, useMemo, useCallback } from "react";
import { History, Trash2, Search, X } from "lucide-react";
import { useHistoryStore, useHistoryIds } from "../../../store/historyStore.ts";
import { usePlaylistStore } from "../../../store/playlistStore.ts";
import { useUiStore } from "../../../store/uiStore.ts";
import { useNotifyStore } from "../../../store/notifyStore.ts";
import { HistoryItemCard } from "./HistoryItemCard.tsx";

export const HistoryListView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { loadPlaylist } = usePlaylistStore();
  const { isImmersive, setSidebarTab } = useUiStore();
  const { show } = useNotifyStore();

  // Stable ID list subscription (Array reference never mutates during normal renders)
  const historyIds = useHistoryIds();
  const byId = useHistoryStore((s) => s.byId);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const clearAll = useHistoryStore((s) => s.clearAll);

  const filteredIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return historyIds;
    return historyIds.filter((id) => {
      const record = byId[id];
      return record && record.title.toLowerCase().includes(q);
    });
  }, [historyIds, byId, searchQuery]);

  const handleSelectHistory = useCallback(
    async (canonicalUrl: string, lastEpisodeId?: string) => {
      setSidebarTab("playlist");
      const success = await loadPlaylist(canonicalUrl, { episodeId: lastEpisodeId });
      if (success && isImmersive) {
        useUiStore.getState().toggleSidebar();
      }
    },
    [loadPlaylist, setSidebarTab, isImmersive]
  );

  const handleDeleteEntry = useCallback(
    (e: React.MouseEvent, canonicalUrl: string, title: string) => {
      e.stopPropagation();
      removeEntry(canonicalUrl);
      show(`已移除「${title}」的觀看紀錄`, "info");
    },
    [removeEntry, show]
  );

  const handleClearAll = () => {
    clearAll();
    setConfirmClearAll(false);
    show("已清空所有歷史紀錄", "info");
  };

  if (historyIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none text-gray-500 space-y-3">
        <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
          <History size={24} className="text-gray-400 opacity-60" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-300">尚無觀看歷史</p>
          <p className="text-[11px] text-gray-500 leading-relaxed max-w-[200px]">
            在上方輸入或貼上動畫網址，播放時會自動記錄您的追番進度
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search Bar when there are 3 or more entries */}
      {historyIds.length >= 3 && (
        <div className="p-2 border-b border-white/5">
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/5 rounded-lg px-2.5 py-1 focus-within:border-white/20 transition-colors">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋歷史紀錄..."
              className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* History Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 pb-6">
        {filteredIds.map((id) => (
          <HistoryItemCard
            key={id}
            canonicalUrl={id}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteEntry}
          />
        ))}

        {filteredIds.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500 text-xs">
            查無符合「{searchQuery}」的歷史紀錄
          </div>
        )}
      </div>

      {/* Bottom Actions: Clear All */}
      <div className="p-3 border-t border-white/5 bg-[#0e0e0e]/50">
        {confirmClearAll ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-400">確定清空全部？</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium transition-colors cursor-pointer"
              >
                確認清空
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClearAll(true)}
            className="w-full py-1.5 px-3 rounded-lg border border-white/5 hover:border-red-500/20 text-gray-500 hover:text-red-400 hover:bg-red-500/5 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 size={12} />
            <span>清空所有歷史紀錄</span>
          </button>
        )}
      </div>
    </div>
  );
};
