import { Copy, Download, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '@/lib/types';

interface Props {
  entry: HistoryEntry;
  onDelete: () => void;
  onLoad: () => void;
}

export function HistoryCard({ entry, onDelete, onLoad }: Props) {
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.skillContent);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([entry.skillContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.skillName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl p-3 cursor-pointer transition-all duration-200 animate-message-in"
      style={{
        background: 'var(--crab-surface-raised)',
        border: '1px solid var(--crab-border)',
      }}
      onClick={onLoad}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-accent)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--crab-text)' }}>{entry.skillName}</p>
          <p className="text-[11px]" style={{ color: 'var(--crab-text-muted)' }}>{dateStr}</p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
          style={{
            background: entry.finalScore >= 0.85 ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
            color: entry.finalScore >= 0.85 ? '#4ade80' : '#fbbf24',
          }}
        >
          {(entry.finalScore * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex gap-1">
        {[
          { icon: Copy, label: 'Copy', onClick: handleCopy, danger: false },
          { icon: Download, label: 'Download', onClick: handleDownload, danger: false },
          { icon: Trash2, label: 'Delete', onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }, danger: true },
        ].map((btn, i) => {
          const Icon = btn.icon;
          return (
            <button
              key={i}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all duration-150"
              style={{ color: btn.danger ? '#f87171' : 'var(--crab-text-muted)' }}
              onClick={btn.onClick}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--crab-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Icon className="w-3 h-3" /> {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
