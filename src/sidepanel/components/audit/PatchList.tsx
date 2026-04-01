import { useState } from 'react';
import type { SkillPatch } from '@/lib/types';
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  patches: SkillPatch[];
}

export function PatchList({ patches }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'success'>('all');

  const filtered = patches.filter(p => filter === 'all' || p.analystType === filter);

  const errorCount = patches.filter(p => p.analystType === 'error').length;
  const successCount = patches.filter(p => p.analystType === 'success').length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { id: 'all',     label: `All (${patches.length})` },
          { id: 'error',   label: `Error (${errorCount})` },
          { id: 'success', label: `Success (${successCount})` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="text-xs px-2.5 py-1 rounded-full transition-all"
            style={{
              background: filter === tab.id ? 'var(--crab-accent-light)' : 'transparent',
              color: filter === tab.id ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
              border: filter === tab.id ? '1px solid var(--crab-accent)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Patch list */}
      <div className="space-y-1.5">
        {filtered.map((patch, idx) => {
          const isError = patch.analystType === 'error';
          const isOpen = expandedIdx === idx;

          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--crab-border)', background: 'var(--crab-surface-raised)' }}
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{ background: 'transparent' }}
              >
                {isError
                  ? <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#f87171' }} />
                  : <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#4ade80' }} />
                }
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--crab-text)' }}>
                  {isError ? (patch.rootCause || `Error patch #${patch.trajectoryId}`) : `Success patch #${patch.trajectoryId}`}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: patch.confidence >= 0.8 ? '#dcfce7' : patch.confidence >= 0.6 ? '#fef9c3' : '#fee2e2',
                    color: patch.confidence >= 0.8 ? '#16a34a' : patch.confidence >= 0.6 ? '#a16207' : '#dc2626',
                  }}
                >
                  {(patch.confidence * 100).toFixed(0)}%
                </span>
                {isOpen
                  ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'var(--crab-text-muted)' }} />
                  : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'var(--crab-text-muted)' }} />
                }
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--crab-border)' }}>
                  {patch.generalizationReason && (
                    <p className="text-xs pt-2 italic" style={{ color: 'var(--crab-text-muted)' }}>
                      {patch.generalizationReason}
                    </p>
                  )}
                  {patch.proposedAdditions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: '#4ade80' }}>+ Additions</p>
                      <ul className="space-y-0.5">
                        {patch.proposedAdditions.map((line, i) => (
                          <li key={i} className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#15803d' }}>
                            + {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {patch.proposedRemovals.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: '#f87171' }}>− Removals</p>
                      <ul className="space-y-0.5">
                        {patch.proposedRemovals.map((line, i) => (
                          <li key={i} className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#fff1f2', color: '#be123c' }}>
                            − {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--crab-text-muted)' }}>
          No patches in this category.
        </p>
      )}
    </div>
  );
}
