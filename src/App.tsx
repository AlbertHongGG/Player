import { TitleBar } from "./components/layout/TitleBar";
import { Notify } from "./components/ui/Notify";
import { PlaylistSidebar } from "./components/layout/PlaylistSidebar";
import { VideoPlayer } from "./components/player/VideoPlayer";
import { useSettingsStore } from "./store/settingsStore";
import { useUiStore } from "./store/uiStore";
import { useImmersiveHover } from "./hooks/useImmersiveHover";

function App() {
  const { isImmersive } = useSettingsStore();
  const { isCursorHidden } = useUiStore();
  useImmersiveHover();

  return (
    <div
      className={`flex w-screen h-screen bg-transparent text-white overflow-hidden rounded-lg relative ${
        isCursorHidden ? "cursor-none" : ""
      }`}
    >
      <TitleBar />
      <Notify />

      {/* Main Content Area - padded top to account for absolute TitleBar in standard mode */}
      <div
        className={`flex flex-1 w-full h-full overflow-hidden relative rounded-lg bg-[#0f0f0f] shadow-2xl ring-1 ring-white/10 ${
          isImmersive ? "pt-0" : "pt-[48px]"
        }`}
      >
        {/* Main Player Area */}
        <main className="flex-1 relative overflow-hidden bg-black flex">
          <div className="w-full h-full flex">
            <VideoPlayer />
          </div>
        </main>

        {/* Right Collapsible Playlist Sidebar (drawer in immersive mode) */}
        <PlaylistSidebar />
      </div>
    </div>
  );
}

export default App;
