import { forwardRef, useImperativeHandle, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Tooltip } from "../../ui/Tooltip.tsx";

export interface SidebarInputBarHandle {
  focus: () => void;
  select: () => void;
}

interface SidebarInputBarProps {
  tab: "playlist" | "history";
  playlistValue: string;
  onPlaylistChange: (value: string) => void;
  onPlaylistSubmit: (value: string) => void;
  isParsing?: boolean;
  filterValue: string;
  onFilterChange: (value: string) => void;
}

export const SidebarInputBar = forwardRef<SidebarInputBarHandle, SidebarInputBarProps>(
  (
    {
      tab,
      playlistValue,
      onPlaylistChange,
      onPlaylistSubmit,
      isParsing = false,
      filterValue,
      onFilterChange,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      select: () => inputRef.current?.select(),
    }));

    const isPlaylistTab = tab === "playlist";
    const currentValue = isPlaylistTab ? playlistValue : filterValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (isPlaylistTab) {
        onPlaylistChange(val);
      } else {
        onFilterChange(val);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && isPlaylistTab) {
        e.preventDefault();
        onPlaylistSubmit(playlistValue);
      }
    };

    const handleActionClick = () => {
      if (isPlaylistTab) {
        onPlaylistSubmit(playlistValue);
      } else {
        inputRef.current?.focus();
      }
    };

    return (
      <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 focus-within:border-[#facc15]/50 focus-within:ring-1 focus-within:ring-[#facc15]/30 transition-all">
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isPlaylistTab ? "Enter or paste Anime1 URL..." : "Search history..."}
          disabled={isPlaylistTab && isParsing}
          className="w-full bg-transparent text-xs text-white placeholder-gray-500 px-3 py-1.5 focus:outline-none selection:bg-[#facc15]/30 disabled:opacity-50"
        />

        {/* Action Button: Load Playlist in Playlist mode / Clean Indicator in Filter mode */}
        {isPlaylistTab ? (
          <Tooltip content="Load Playlist" position="bottom">
            <button
              type="button"
              onClick={handleActionClick}
              disabled={isParsing || !playlistValue.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#facc15] hover:bg-white text-black transition-all disabled:opacity-40 disabled:hover:bg-[#facc15] shrink-0 cursor-pointer"
            >
              {isParsing ? (
                <Loader2 size={13} className="animate-spin text-black" />
              ) : (
                <Search size={13} strokeWidth={2.5} />
              )}
            </button>
          </Tooltip>
        ) : (
          <div className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 shrink-0">
            <Search size={13} strokeWidth={2} />
          </div>
        )}
      </div>
    );
  }
);

SidebarInputBar.displayName = "SidebarInputBar";
