import React, { useMemo, useCallback } from "react";
import { History } from "lucide-react";
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
  const { loadPlaylist } = usePlaylistStore();
  const { isImmersive, setSidebarTab, historyFilterQuery } = useUiStore();
  const { show } = useNotifyStore();

  // Stable ID list subscription
  const historyIds = useHistoryIds();
  const byId = useHistoryStore((s) => s.byId);
  const removeEntry = useHistoryStore((s) => s.removeEntry);

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
    </div>
  );
};
