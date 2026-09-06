import React from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { SettingSection } from "../settings/SettingSection";
import { SettingRow } from "../settings/SettingRow";
import { SettingToggle } from "../settings/SettingControls";

export const SettingsPanel: React.FC = () => {
  const store = useSettingsStore();

  return (
    <div className="w-full h-full p-8 text-white overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
      <div className="max-w-3xl mx-auto pt-4">
        <div className="space-y-8">
          {/* Playback Preferences */}
          <SettingSection title="Playback Preferences">
            <SettingRow
              label="Auto-Play Next Episode"
              description="Automatically load and start the next episode when current video finishes."
            >
              <SettingToggle
                settingKey="autoPlayNext"
                checked={store.autoPlayNext}
                setter={store.setAutoPlayNext}
              />
            </SettingRow>
            <SettingRow
              label="Default to Immersive Mode"
              description="Fill the entire window with video with auto-hiding header and controls (PiP feel)."
            >
              <SettingToggle
                settingKey="isImmersive"
                checked={store.isImmersive}
                setter={store.setIsImmersive}
              />
            </SettingRow>
          </SettingSection>

          {/* Keyboard Shortcuts Reference */}
          <SettingSection title="Global Keyboard Shortcuts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Play / Pause</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Toggle / Exit Fullscreen</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Enter / Esc</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Toggle Immersive Mode</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">I</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Toggle Playlist Sidebar</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">P</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Seek -1s / +1s</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Seek -5s / +5s</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Ctrl + ← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Playback Speed -0.1x / +0.1x</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">A / D</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Toggle Normal Speed (1.0x)</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">S</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 md:col-span-2">
                <span className="text-gray-300">Frame-by-Frame Scrubbing (1/30s)</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">&lt; (,) / &gt; (.)</kbd>
              </div>
            </div>
          </SettingSection>
        </div>
      </div>
    </div>
  );
};
