import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
import { Minus, Square, X, Maximize, Settings, PanelRightClose, PanelRightOpen, PictureInPicture2 } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { usePlaylistStore } from "../../store/playlistStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useNotifyStore } from "../../store/notifyStore";

interface TitleBarProps {
  isFloating?: boolean;
  isVisible?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isFloating = false,
  isVisible = true,
  onHoverChange,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  const { isSidebarOpen, toggleSidebar } = usePlaylistStore();
  const { isImmersive, toggleImmersive } = useSettingsStore();
  const { show } = useNotifyStore();

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("Could not check maximized state:", e);
      }
    };
    checkMaximized();

    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleMinimize = () => appWindow.minimize();
  const handleToggleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  const handleOpenSettings = async () => {
    try {
      const windows = await getAllWebviewWindows();
      const existingWindow = windows.find((w) => w.label === "settings");

      if (existingWindow) {
        await existingWindow.setFocus();
      } else {
        const webview = new WebviewWindow("settings", {
          url: "/#/settings",
          title: "Settings",
          width: 600,
          height: 700,
          decorations: false,
          transparent: true,
          resizable: true,
          minWidth: 350,
          minHeight: 500,
        });

        webview.once("tauri://error", function (e) {
          console.error("Error creating settings window", e);
          show("Failed to open settings window. Check permissions.", "error");
        });
      }
    } catch (e) {
      console.error("Failed to check windows or create window", e);
      show("Failed to open settings window.", "error");
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={
        isFloating
          ? `fixed top-0 left-0 w-full h-[48px] z-50 transition-all duration-300 ease-out select-none px-3 flex items-center ${
              isVisible
                ? "translate-y-0 opacity-100 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-md pointer-events-auto"
                : "-translate-y-full opacity-0 pointer-events-none"
            }`
          : "h-[48px] w-full flex items-center bg-black/60 backdrop-blur-md select-none border-b border-white/5 z-50 absolute top-0 left-0 px-3"
      }
    >
      {/* Left Section: Sidebar Toggle */}
      <div className="flex items-center gap-1 w-1/3 h-full" data-tauri-drag-region>
        <div
          className="flex items-center gap-1"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Tooltip content={isSidebarOpen ? "Hide Playlist (P)" : "Show Playlist (P)"} position="bottom">
            <button
              onClick={toggleSidebar}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                isSidebarOpen
                  ? "text-[#facc15] hover:bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {isSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Center Section: Focused Minimal Area (No Title, No Logs) */}
      <div
        className="flex items-center justify-center w-1/3 h-full pointer-events-none"
        data-tauri-drag-region
      />

      {/* Right Section: Settings & Window Controls */}
      <div className="flex items-center justify-end gap-1 w-1/3 h-full" data-tauri-drag-region>
        <div
          className="flex items-center gap-1"
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Immersive Mode Toggle */}
          <Tooltip
            content={isImmersive ? "Exit Immersive Mode (I)" : "Immersive Mode (I)"}
            position="bottom"
          >
            <button
              onClick={toggleImmersive}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                isImmersive
                  ? "text-[#facc15] hover:bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              } mr-1`}
              aria-label="Toggle Immersive Mode"
            >
              <PictureInPicture2 size={16} />
            </button>
          </Tooltip>

          <Tooltip content="Settings" position="bottom">
            <button
              onClick={handleOpenSettings}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-gray-400 hover:text-white hover:bg-white/10 hover:rotate-90 mr-2"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </Tooltip>

          <div className="w-px h-4 bg-white/10 mr-2" />

          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all outline-none"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <Minus size={16} />
          </button>

          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all outline-none"
            onClick={handleToggleMaximize}
            aria-label="Maximize"
          >
            {isMaximized ? <Square size={14} /> : <Maximize size={14} />}
          </button>

          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white text-gray-400 transition-all outline-none"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
