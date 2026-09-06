import { create } from 'zustand';

interface SettingsStore {
  autoPlayNext: boolean;
  rememberProgress: boolean;
  defaultVolume: number;
  bufferSize: string;
  requestTimeout: number;
  hardwareAcceleration: boolean;

  setAutoPlayNext: (val: boolean) => void;
  setRememberProgress: (val: boolean) => void;
  setDefaultVolume: (val: number) => void;
  setBufferSize: (val: string) => void;
  setRequestTimeout: (val: number) => void;
  setHardwareAcceleration: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  autoPlayNext: true,
  rememberProgress: true,
  defaultVolume: 100,
  bufferSize: "2MB",
  requestTimeout: 15,
  hardwareAcceleration: true,

  setAutoPlayNext: (autoPlayNext) => set({ autoPlayNext }),
  setRememberProgress: (rememberProgress) => set({ rememberProgress }),
  setDefaultVolume: (defaultVolume) => set({ defaultVolume }),
  setBufferSize: (bufferSize) => set({ bufferSize }),
  setRequestTimeout: (requestTimeout) => set({ requestTimeout }),
  setHardwareAcceleration: (hardwareAcceleration) => set({ hardwareAcceleration }),
}));
