import { emit } from "@tauri-apps/api/event";
import { useCallback } from "react";

export function useSettingChange<T>() {
  const handleSettingChange = useCallback(
    async (
      key: string,
      value: T,
      setter: (val: T) => void,
      sideEffect?: (val: T) => void
    ) => {
      setter(value);
      if (sideEffect) {
        sideEffect(value);
      }
      try {
        await emit("setting-changed", { key, value });
      } catch (e) {
        console.warn("Failed to emit setting change event:", e);
      }
    },
    []
  );

  return handleSettingChange;
}
