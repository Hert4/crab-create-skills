import { HistoryCard } from './HistoryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useHistory } from '@/hooks/useHistory';
import { useCompilationStore } from '@/stores/compilationStore';
import { Clock, Trash2 } from 'lucide-react';

export function HistoryList() {
  const { entries, loading, deleteEntry, clearAll } = useHistory();
  const { setSkill } = useCompilationStore();

  const handleLoad = (entry: typeof entries[0]) => {
    setSkill({
      name: entry.skillName,
      content: entry.skillContent,
      intent: { skill_name: entry.skillName, skill_type: 'capability', description: '', target_user: '', domain: '' },
      steps: { workflow_name: '', steps: [], decision_points: [] },
      constraints: { hard_rules: [], soft_rules: [], edge_cases: [], exceptions: [], validations: [], permissions: [] },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="thinking-dots">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--crab-accent)' }} />
          <span className="w-2 h-2 rounded-full inline-block mx-1" style={{ background: 'var(--crab-accent)' }} />
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--crab-accent)' }} />
        </span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No History"
        description="Compiled skills will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '0.5px solid var(--crab-border)', background: 'var(--crab-bg-secondary)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--crab-text)' }}>{entries.length} skill(s)</span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150"
          style={{ color: '#f87171' }}
          onClick={clearAll}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Trash2 className="w-3 h-3" /> Clear All
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.map((entry) => (
          <HistoryCard
            key={entry.id}
            entry={entry}
            onDelete={() => deleteEntry(entry.id)}
            onLoad={() => handleLoad(entry)}
          />
        ))}
      </div>
    </div>
  );
}
