import { create } from 'zustand';
import type { Settings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';

interface Store {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<Store>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      set({ settings: response || DEFAULT_SETTINGS, loaded: true });
    } catch {
      set({ settings: DEFAULT_SETTINGS, loaded: true });
    }
  },

  update: async (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', data: newSettings });
    } catch { /* ignore */ }
  },
}));
