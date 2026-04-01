import { useState } from 'react';
import { GitCompare } from 'lucide-react';

interface Props {
  originalContent: string;
  evolvedContent: string;
}

export function SkillDiff({ originalContent, evolvedContent }: Props) {
  const [view, setView] = useState<'original' | 'evolved' | 'diff'>('diff');

  /** Compute a very simple line-level diff for display purposes. */
  function computeDiffLines(): { type: 'same' | 'add' | 'remove'; text: string }[] {
    const origLines = originalContent.split('\n');
    const evolvedLines = evolvedContent.split('\n');

    // Use a naive approach: mark lines that exist only in one version
    const origSet = new Set(origLines.map(l => l.trim()).filter(Boolean));
    const evolvedSet = new Set(evolvedLines.map(l => l.trim()).filter(Boolean));

    const result: { type: 'same' | 'add' | 'remove'; text: string }[] = [];

    // Show removed lines (in original but not evolved)
    for (const line of origLines) {
      const t = line.trim();
      if (!t) continue;
      if (!evolvedSet.has(t)) {
        result.push({ type: 'remove', text: line });
      }
    }

    // Show added lines (in evolved but not original)
    for (const line of evolvedLines) {
      const t = line.trim();
      if (!t) continue;
      if (!origSet.has(t)) {
        result.push({ type: 'add', text: line });
      }
    }

    if (result.length === 0) {
      result.push({ type: 'same', text: '(No changes detected)' });
    }

    return result;
  }

  const diffLines = view === 'diff' ? computeDiffLines() : [];

  const isIdentical = originalContent.trim() === evolvedContent.trim();

  return (
    <div>
      {/* View selector */}
      <div className="flex items-center gap-1 mb-3">
        <GitCompare className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--crab-accent)' }} />
        {(['original', 'diff', 'evolved'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="text-xs px-2.5 py-1 rounded-full capitalize transition-all"
            style={{
              background: view === v ? 'var(--crab-accent-light)' : 'transparent',
              color: view === v ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
              border: view === v ? '1px solid var(--crab-accent)' : '1px solid transparent',
            }}
          >
            {v}
          </button>
        ))}
        {isIdentical && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
            No changes
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className="rounded-xl overflow-auto text-xs font-mono"
        style={{
          maxHeight: 320,
          background: 'var(--crab-surface-raised)',
          border: '1px solid var(--crab-border)',
          padding: '10px 12px',
        }}
      >
        {view === 'diff' ? (
          <div className="space-y-0.5">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className="rounded px-1"
                style={{
                  background: line.type === 'add' ? '#f0fdf4' : line.type === 'remove' ? '#fff1f2' : 'transparent',
                  color: line.type === 'add' ? '#15803d' : line.type === 'remove' ? '#be123c' : 'var(--crab-text-muted)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {line.type === 'add' ? '+ ' : line.type === 'remove' ? '− ' : '  '}{line.text}
              </div>
            ))}
          </div>
        ) : (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--crab-text)',
              margin: 0,
            }}
          >
            {view === 'original' ? originalContent : evolvedContent}
          </pre>
        )}
      </div>
    </div>
  );
}
