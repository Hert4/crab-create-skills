import { useCompilationStore } from '@/stores/compilationStore';
import { useCompilation } from '@/hooks/useCompilation';
import type { Phase } from '@/lib/types';

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  ingest:   'Reading files',
  extract:  'Extracting logic',
  assemble: 'Building skill',
  evaluate: 'Generating evals',
  validate: 'Validating',
  done:     'Complete',
  error:    'Error',
};

const PHASE_ORDER: Phase[] = ['ingest', 'extract', 'assemble', 'evaluate', 'validate'];

export function ProgressStepper() {
  const { phase, progress, detail } = useCompilationStore();
  const { cancelCompilation } = useCompilation();
  const isDone = phase === 'done';
  const isError = phase === 'error';
  const isRunning = !isDone && !isError && phase !== 'idle';
  const currentIdx = PHASE_ORDER.indexOf(phase as Phase);
  const label = PHASE_LABELS[phase] ?? phase;

  return (
    <div style={{
      flexShrink: 0,
      background: 'var(--crab-bg-secondary)',
      borderBottom: '0.5px solid var(--crab-border)',
    }}>
      {/* Top row: spinner + phase steps + cancel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        gap: 8,
      }}>
        {/* Left: spinner + current label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {isRunning && (
            <div style={{ width: 16, height: 16, position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: 'var(--crab-accent)',
                animation: 'spinnerRotate 0.8s linear infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid transparent',
                borderRightColor: 'rgba(201, 100, 66, 0.3)',
                animation: 'spinnerRotate 1.2s linear infinite reverse',
              }} />
            </div>
          )}
          {isDone && (
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#1a1a1a', fontWeight: 700,
              boxShadow: '0 0 8px rgba(74,222,128,0.4)',
            }}>✓</div>
          )}
          {isError && (
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'white', fontWeight: 700,
            }}>✕</div>
          )}
          <span style={{
            fontSize: 12,
            color: isDone ? '#4ade80' : isError ? '#f87171' : 'var(--crab-text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {detail || label}
          </span>
        </div>

        {/* Right: phase dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {PHASE_ORDER.map((p, i) => {
            const done = isDone || currentIdx > i;
            const active = currentIdx === i;
            return (
              <div
                key={p}
                title={PHASE_LABELS[p]}
                style={{
                  width: done ? 18 : active ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: done
                    ? '#4ade80'
                    : active
                    ? 'var(--crab-accent)'
                    : 'var(--crab-bg-tertiary)',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: active ? '0 0 6px rgba(201,100,66,0.5)' : done ? '0 0 4px rgba(74,222,128,0.3)' : 'none',
                  animation: active ? 'stepPulse 1.5s ease-in-out infinite' : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Cancel */}
        {isRunning && (
          <button
            onClick={cancelCompilation}
            style={{
              padding: '3px 12px',
              background: 'transparent',
              border: '0.5px solid var(--crab-border)',
              color: 'var(--crab-text-secondary)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 24,
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#f87171';
              (e.currentTarget as HTMLElement).style.borderColor = '#f87171';
              (e.currentTarget as HTMLElement).style.color = 'white';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-secondary)';
            }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Progress bar — thin, no rounded labels */}
      <div style={{ height: 2, background: 'var(--crab-bg-tertiary)', margin: '0 0 0 0' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: isDone
            ? 'linear-gradient(90deg, #4ade80, #22c55e)'
            : 'linear-gradient(90deg, var(--crab-accent), var(--crab-accent-hover))',
          transition: 'width 0.4s ease-out',
          boxShadow: isDone
            ? '0 0 6px rgba(74,222,128,0.5)'
            : '0 0 6px rgba(201,100,66,0.4)',
        }} />
      </div>
    </div>
  );
}
