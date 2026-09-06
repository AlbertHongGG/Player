import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useSettingsStore } from "../../store/settingsStore";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
  delayDuration,
}) => {
  const showTooltips = useSettingsStore((state) => state.showTooltips);

  // Transparent Proxy: When tooltips are disabled, bypass Radix UI completely
  // (0 DOM portal nodes, 0 event listeners, 0 ghost popups)
  if (!showTooltips) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration} disableHoverableContent>
      <TooltipPrimitive.Trigger asChild onFocus={(e) => e.preventDefault()}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={position}
          sideOffset={6}
          collisionPadding={12}
          className="z-[10000] px-2.5 py-1.5 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium tracking-wide rounded shadow-lg whitespace-nowrap will-change-[transform,opacity] data-[state=delayed-open]:animate-tooltip-in data-[state=instant-open]:animate-tooltip-in data-[state=closed]:animate-tooltip-out"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
