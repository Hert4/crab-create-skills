import type { SopPattern } from '@/lib/types';

const CATEGORY_COLORS: Record<SopPattern['category'], { bg: string; text: string; label: string }> = {
  verification:    { bg: '#dcfce7', text: '#16a34a', label: 'Verification' },
  'tool-selection': { bg: '#dbeafe', text: '#2563eb', label: 'Tool Selection' },
  safety:          { bg: '#fef9c3', text: '#a16207', label: 'Safety' },
  workflow:        { bg: '#ede9fe', text: '#7c3aed', label: 'Workflow' },
  other:           { bg: '#f3f4f6', text: '#6b7280', label: 'Other' },
};

interface Props {
  pattern: SopPattern;
  totalPatches: number;
}

export function SopCard({ pattern, totalPatches }: Props) {
  const color = CATEGORY_COLORS[pattern.category] ?? CATEGORY_COLORS.other;
  const pct = totalPatches > 0 ? Math.round((pattern.patchCount / totalPatches) * 100) : 0;

  return (
    <div
      className="rounded-xl p-3 animate-welcome"
      style={{
        background: 'var(--crab-surface-raised)',
        border: '1px solid var(--crab-border)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--crab-text)' }}>
          {pattern.title}
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ background: color.bg, color: color.text }}
        >
          {color.label}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: 'var(--crab-text-muted)' }}>
        {pattern.description}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--crab-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'var(--crab-accent)' }}
          />
        </div>
        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--crab-text-muted)' }}>
          {pattern.patchCount}/{totalPatches}
        </span>
      </div>
    </div>
  );
}
