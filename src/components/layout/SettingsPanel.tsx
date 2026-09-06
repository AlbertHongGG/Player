import React from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { SettingSection } from "../settings/SettingSection";
import { SettingRow, SettingDivider, SettingGroup } from "../settings/SettingRow";
import { SettingSelect, SettingToggle, SettingSlider } from "../settings/SettingControls";

const BUFFER_OPTIONS = [
  { value: "1MB", label: "1MB (Low Memory)" },
  { value: "2MB", label: "2MB (Balanced / Recommended)" },
  { value: "4MB", label: "4MB (Smooth Scrubbing)" },
  { value: "8MB", label: "8MB (High Bandwidth)" },
];

export const SettingsPanel: React.FC = () => {
  const store = useSettingsStore();

  return (
    <div className="w-full h-full p-8 text-white overflow-y-auto custom-scrollbar bg-[#0f0f0f]">
      <div className="max-w-3xl mx-auto pt-4">
        <div className="space-y-8">
          {/* Playback Preferences */}
          <SettingSection title="Playback & Player Preferences">
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
            <SettingDivider />

            <SettingRow
              label="Remember Playback Progress"
              description="Resume playback from your last watched timestamp."
            >
              <SettingToggle
                settingKey="rememberProgress"
                checked={store.rememberProgress}
                setter={store.setRememberProgress}
              />
            </SettingRow>
            <SettingDivider />

            <SettingRow
              label="Hardware Decode Acceleration"
              description="Leverage GPU for smoother decoding and lower CPU usage."
            >
              <SettingToggle
                settingKey="hardwareAcceleration"
                checked={store.hardwareAcceleration}
                setter={store.setHardwareAcceleration}
              />
            </SettingRow>
            <SettingDivider />

            <SettingGroup title="Audio & Volume">
              <SettingSlider
                settingKey="defaultVolume"
                label="Default Startup Volume"
                value={store.defaultVolume}
                min={0}
                max={100}
                unit="%"
                setter={store.setDefaultVolume}
              />
            </SettingGroup>
          </SettingSection>

          {/* Streaming & Network */}
          <SettingSection title="Streaming Gateway & Network">
            <SettingRow
              label="Stream Buffer Chunk Size"
              description="Size of byte-range chunks fetched from remote CDN via local proxy."
              layout="grid"
            >
              <SettingSelect
                settingKey="bufferSize"
                value={store.bufferSize}
                options={BUFFER_OPTIONS}
                setter={store.setBufferSize}
              />
            </SettingRow>
            <SettingDivider />

            <SettingGroup title="Timeout Configuration">
              <SettingSlider
                settingKey="requestTimeout"
                label="HTTP Request Timeout"
                value={store.requestTimeout}
                min={5}
                max={30}
                unit="s"
                setter={store.setRequestTimeout}
              />
            </SettingGroup>
          </SettingSection>

          {/* Keyboard Shortcuts Reference */}
          <SettingSection title="Global Keyboard Shortcuts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Play / Pause</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Toggle Fullscreen</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Exit Fullscreen</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">Escape</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-300">Seek Backward / Forward 1s</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[#facc15]">← / →</kbd>
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
