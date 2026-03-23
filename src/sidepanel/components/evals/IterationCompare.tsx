import type { IterationResult } from '@/lib/types';

interface Props {
  iterations: IterationResult[];
  selected: number;
  onSelect: (idx: number) => void;
}

export function IterationCompare({ iterations, selected, onSelect }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {iterations.map((iter, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={selected === i ? {
            background: 'var(--crab-accent)',
            color: 'white',
            boxShadow: '0 0 10px rgba(201, 100, 66, 0.3)',
          } : {
            background: 'var(--crab-surface-raised)',
            border: '1px solid var(--crab-border)',
            color: 'var(--crab-text-secondary)',
          }}
        >
          Iter {iter.iteration}
          <span
            className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
            style={{
              background: selected === i ? 'rgba(255,255,255,0.2)' : (iter.avgScore >= 0.85 ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)'),
              color: selected === i ? 'white' : (iter.avgScore >= 0.85 ? '#4ade80' : '#fbbf24'),
            }}
          >
            {(iter.avgScore * 100).toFixed(0)}%
          </span>
        </button>
      ))}
    </div>
  );
}
