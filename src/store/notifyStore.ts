import { create } from 'zustand';

interface NotifyStore {
  message: string | null;
  type: 'success' | 'error' | 'info' | 'warning';
  show: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  hide: () => void;
}

export const useNotifyStore = create<NotifyStore>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type });
    setTimeout(() => {
      set({ message: null });
    }, 3000);
  },
  hide: () => set({ message: null }),
}));
