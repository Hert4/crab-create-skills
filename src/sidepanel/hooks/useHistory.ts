import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '@/lib/types';

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      setEntries(history);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await chrome.storage.local.set({ history: updated });
  };

  const clearAll = async () => {
    setEntries([]);
    await chrome.storage.local.set({ history: [] });
  };

  return { entries, loading, deleteEntry, clearAll, refresh: load };
}
