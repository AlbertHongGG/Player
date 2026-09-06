import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Settings } from "lucide-react";

export const SettingsTitleBar: React.FC = () => {
  const appWindow = getCurrentWindow();

  const handleClose = () => appWindow.close();

  const handleDrag = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.buttons === 1) {
      appWindow.startDragging();
    }
  };

  return (
    <div
      onMouseDown={handleDrag}
      className="h-[48px] w-full flex justify-between items-center bg-black/60 backdrop-blur-md select-none border-b border-white/5 z-50 absolute top-0 left-0 cursor-move"
    >
      <div className="flex items-center pl-4 pr-6 h-full pointer-events-none">
        <Settings size={14} className="text-[#facc15] mr-2" />
        <span className="text-xs font-bold text-gray-300 tracking-wider">SETTINGS</span>
      </div>

      <div className="flex-1 h-full" />

      {/* Action Buttons */}
      <div
        className="flex items-center pr-4 h-full gap-2 cursor-default"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white text-gray-400 transition-all outline-none"
          onClick={handleClose}
          aria-label="Close settings"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
