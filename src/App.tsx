import { TitleBar } from "./components/layout/TitleBar";
import { Notify } from "./components/ui/Notify";
import { PlaylistSidebar } from "./components/layout/PlaylistSidebar";
import { VideoPlayer } from "./components/player/VideoPlayer";

function App() {
  return (
    <div className="flex w-screen h-screen bg-transparent text-white overflow-hidden rounded-lg relative">
      <TitleBar />
      <Notify />

      {/* Main Content Area - padded top to account for absolute TitleBar */}
      <div className="flex flex-1 w-full h-full pt-[48px] overflow-hidden relative rounded-lg bg-[#0f0f0f] shadow-2xl ring-1 ring-white/10">
        {/* Main Player Area */}
        <main className="flex-1 relative overflow-hidden bg-black flex">
          <div className="w-full h-full flex">
            <VideoPlayer />
          </div>
        </main>

        {/* Right Collapsible Playlist Sidebar */}
        <PlaylistSidebar />
      </div>
    </div>
  );
}

export default App;
