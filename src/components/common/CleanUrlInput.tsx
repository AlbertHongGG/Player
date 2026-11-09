import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Search, Loader2, Clipboard, X, CheckCircle2 } from "lucide-react";
import { PlayableUrl } from "../../domain/url/PlayableUrl.ts";
import { Tooltip } from "../ui/Tooltip";
import { useNotifyStore } from "../../store/notifyStore";

export interface CleanUrlInputHandle {
  focus: () => void;
  select: () => void;
}

export interface CleanUrlInputProps {
  value?: string;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onSubmit: (url: PlayableUrl) => void;
  onChange?: (url: PlayableUrl) => void;
}

export const CleanUrlInput = forwardRef<CleanUrlInputHandle, CleanUrlInputProps>(({
  value = "",
  placeholder = "Enter or paste Anime1 URL...",
  isLoading = false,
  disabled = false,
  className = "",
  onSubmit,
  onChange,
}, ref) => {
  const { show } = useNotifyStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    select: () => inputRef.current?.select(),
  }));

  // Initialize input with clean human-readable representation
  const [inputText, setInputText] = useState(() => {
    return value ? PlayableUrl.parse(value).displayUrl : "";
  });

  // Keep in sync with external value updates (e.g. from store or URL bar)
  useEffect(() => {
    const cleanExternal = value ? PlayableUrl.parse(value).displayUrl : "";
    setInputText((prev) => {
      // Only update if canonical/display forms differ to preserve cursor position
      if (PlayableUrl.parse(prev).equals(cleanExternal)) {
        return prev;
      }
      return cleanExternal;
    });
  }, [value]);

  const currentUrl = PlayableUrl.parse(inputText);

  const handleTextChange = (newText: string) => {
    setInputText(newText);
    if (onChange) {
      onChange(PlayableUrl.parse(newText));
    }
  };

  /**
   * Smart Paste Interceptor:
   * When user pastes (Ctrl+V) anywhere in the input:
   * Automatically transforms percent-encoded URI sequences (%e5%b9%b4...)
   * into clean human-readable Unicode (2026年春季) immediately on presentation.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const rawPasted = e.clipboardData.getData("text");
      if (!rawPasted) return;

      e.preventDefault();

      const parsedPasted = PlayableUrl.parse(rawPasted);
      const cleanToInsert = parsedPasted.displayUrl;

      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      const updated =
        input.value.slice(0, start) + cleanToInsert + input.value.slice(end);

      handleTextChange(updated);

      // Restore cursor position right after pasted insertion
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const newPos = start + cleanToInsert.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      });

      if (parsedPasted.providerId === "anime1") {
        show("Pasted Anime1 URL", "success");
      }
    },
    [show]
  );

  /**
   * Clipboard Button Click Handler:
   * Safely reads clipboard and transforms to clean presentation format.
   */
  const handlePasteFromClipboardButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        show("Clipboard is empty", "warning");
        return;
      }

      const parsed = PlayableUrl.parse(trimmed);
      handleTextChange(parsed.displayUrl);

      if (parsed.providerId === "anime1") {
        show("Pasted Anime1 URL from clipboard", "success");
      } else {
        show("Pasted text from clipboard", "info");
      }
      inputRef.current?.focus();
    } catch (err) {
      console.warn("Clipboard read failed:", err);
      show("Please allow clipboard permissions or paste manually", "warning");
    }
  };

  const handleClear = () => {
    handleTextChange("");
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (disabled || isLoading) return;

    const trimmed = inputText.trim();
    if (!trimmed) {
      show("Please enter an Anime1 URL", "warning");
      inputRef.current?.focus();
      return;
    }

    const parsed = PlayableUrl.parse(trimmed);
    onSubmit(parsed);
  };

  const isAnime1 = currentUrl.providerId === "anime1";

  return (
    <div
      className={`flex items-center gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 focus-within:border-[#facc15]/50 focus-within:ring-1 focus-within:ring-[#facc15]/30 transition-all ${className}`}
    >
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={(e) => handleTextChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="w-full bg-transparent text-xs text-white placeholder-gray-500 px-2.5 py-1.5 focus:outline-none selection:bg-[#facc15]/30 disabled:opacity-50"
      />

      {/* Clear Button (shows when text is entered) */}
      {inputText && !isLoading && (
        <Tooltip content="Clear" position="bottom">
          <button
            type="button"
            onClick={handleClear}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all shrink-0 cursor-pointer"
          >
            <X size={12} />
          </button>
        </Tooltip>
      )}

      {/* Recognized Provider Indicator */}
      {isAnime1 && (
        <Tooltip content="Recognized: Anime1.me" position="bottom">
          <span className="flex items-center text-[#facc15] px-1 shrink-0">
            <CheckCircle2 size={13} />
          </span>
        </Tooltip>
      )}

      {/* Paste from Clipboard Button */}
      <Tooltip content="Paste from Clipboard" position="bottom">
        <button
          type="button"
          onClick={handlePasteFromClipboardButton}
          disabled={disabled || isLoading}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <Clipboard size={13} />
        </button>
      </Tooltip>

      {/* Load / Parse Action Button */}
      <Tooltip content="Load Playlist" position="bottom">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isLoading || !inputText.trim()}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#facc15] hover:bg-white text-black transition-all disabled:opacity-40 disabled:hover:bg-[#facc15] shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 size={13} className="animate-spin text-black" />
          ) : (
            <Search size={13} strokeWidth={2.5} />
          )}
        </button>
      </Tooltip>
    </div>
  );
});

CleanUrlInput.displayName = "CleanUrlInput";
