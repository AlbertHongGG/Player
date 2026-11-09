import React from "react";
import { LucideIcon } from "lucide-react";

interface SidebarEmptyStateProps {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
}

export const SidebarEmptyState: React.FC<SidebarEmptyStateProps> = ({
  icon: Icon,
  title,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer group"
    >
      <div className="relative mb-6 flex items-center justify-center">
        {/* Layer 1: Ambient Background Glow */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-[#facc15]/5 blur-2xl scale-90 opacity-40 group-hover:bg-[#facc15]/15 group-hover:scale-115 group-hover:opacity-80 transition-all duration-500 ease-out pointer-events-none" />

        {/* Layer 2: Sub-orbital Ring */}
        <div className="w-28 h-28 rounded-full border border-white/[0.03] group-hover:border-[#facc15]/10 absolute transition-colors duration-500 pointer-events-none" />

        {/* Layer 3: Orbiting Dashed Ring with golden resonance */}
        <div className="w-32 h-32 rounded-full border border-dashed border-white/10 group-hover:border-[#facc15]/30 group-hover:scale-105 flex items-center justify-center relative animate-[spin_35s_linear_infinite] transition-all duration-500 ease-out pointer-events-none" />

        {/* Layer 4: Frosted Core Glass Badge with elevation and inner aura */}
        <div className="w-20 h-20 rounded-full bg-[#131313]/90 border border-white/10 group-hover:border-[#facc15]/40 group-hover:scale-105 group-hover:bg-[#181818] shadow-[0_4px_24px_rgba(0,0,0,0.7)] group-hover:shadow-[0_0_25px_rgba(250,204,21,0.2)] flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-md transition-all duration-300 ease-out">
          {/* Layer 5: Glowing Golden Accent Icon */}
          <Icon
            size={28}
            className="text-[#facc15] opacity-75 group-hover:opacity-100 group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(250,204,21,0.75)] transition-all duration-300 ease-out"
          />
        </div>
      </div>

      {/* Layer 6: Dynamic Tracking Typography - Concise Title Only */}
      <span className="text-[10px] text-gray-500 font-bold tracking-[0.3em] uppercase group-hover:text-gray-300 group-hover:tracking-[0.35em] transition-all duration-300">
        {title}
      </span>
    </div>
  );
};
