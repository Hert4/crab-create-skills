import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export function useSettings() {
  const { settings, loaded, load, update } = useSettingsStore();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return { settings, loaded, update };
}
