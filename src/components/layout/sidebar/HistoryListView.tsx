import React, { useState, useMemo, useCallback } from "react";
import { History, Trash2 } from "lucide-react";
import { useHistoryStore, useHistoryIds } from "../../../store/historyStore.ts";
import { usePlaylistStore } from "../../../store/playlistStore.ts";
import { useUiStore } from "../../../store/uiStore.ts";
import { useNotifyStore } from "../../../store/notifyStore.ts";
import { HistoryItemCard } from "./HistoryItemCard.tsx";
import { SidebarEmptyState } from "./SidebarEmptyState.tsx";

interface HistoryListViewProps {
  onFocusInput?: () => void;
}

export const HistoryListView: React.FC<HistoryListViewProps> = ({ onFocusInput }) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { loadPlaylist } = usePlaylistStore();
  const { isImmersive, setSidebarTab, historyFilterQuery } = useUiStore();
  const { show } = useNotifyStore();

  // Stable ID list subscription
  const historyIds = useHistoryIds();
  const byId = useHistoryStore((s) => s.byId);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const clearAll = useHistoryStore((s) => s.clearAll);

  const filteredIds = useMemo(() => {
    const q = historyFilterQuery.trim().toLowerCase();
    if (!q) return historyIds;
    return historyIds.filter((id) => {
      const record = byId[id];
      return record && record.title.toLowerCase().includes(q);
    });
  }, [historyIds, byId, historyFilterQuery]);

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
      <SidebarEmptyState
        icon={History}
        title="NO HISTORY"
        onClick={onFocusInput}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

        {filteredIds.length === 0 && historyFilterQuery && (
          <div className="text-center py-12 text-gray-500 text-xs font-mono uppercase tracking-widest">
            No results found for "{historyFilterQuery}"
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
