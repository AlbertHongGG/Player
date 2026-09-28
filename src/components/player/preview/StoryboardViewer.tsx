import React from "react";
import { StoryboardTrack } from "../../../types/bindings";
import { StoryboardEngine } from "./StoryboardEngine";

interface StoryboardViewerProps {
  track: StoryboardTrack | null;
  time: number;
  width?: number;
  height?: number;
}

/**
 * GPU-Accelerated Native Storyboard Sprite Sheet Viewer.
 *
 * Achieves 0ms latency and 60fps/144fps cursor tracking by relying entirely on
 * hardware-accelerated CSS background texture shifting.
 */
export const StoryboardViewer: React.FC<StoryboardViewerProps> = ({
  track,
  time,
  width = 160,
  height = 90,
}) => {
  if (!track || !track.sprite_url) {
    return <div className="w-full h-full bg-black" />;
  }

  const { bgX, bgY, bgWidth } = StoryboardEngine.getSpriteOffset(
    time,
    track,
    width,
    height
  );

  return (
    <div
      className="w-full h-full bg-black select-none pointer-events-none"
      style={{
        backgroundImage: `url("${track.sprite_url}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${bgWidth}px auto`,
      }}
    />
  );
};
