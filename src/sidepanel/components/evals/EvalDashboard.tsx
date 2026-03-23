import { useState } from 'react';
import { ScoreChart } from './ScoreChart';
import { EvalCard } from './EvalCard';
import { IterationCompare } from './IterationCompare';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCompilationStore } from '@/stores/compilationStore';
import { BarChart3, TrendingUp, Target, Zap } from 'lucide-react';

export function EvalDashboard() {
  const { validation, evals } = useCompilationStore();
  const [selectedIter, setSelectedIter] = useState(0);

  if (!validation || !evals) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Evaluations Yet"
        description="Generate a skill first to see evaluation results."
      />
    );
  }

  const currentIter = validation.iterations[selectedIter];

  const stats = [
    { icon: Target, label: 'Best Score', value: `${(validation.bestScore * 100).toFixed(0)}%`, color: '#4ade80' },
    { icon: TrendingUp, label: 'vs Baseline', value: `+${(validation.improvementOverBaseline * 100).toFixed(0)}%`, color: 'var(--crab-accent)' },
    { icon: Zap, label: 'Iterations', value: `${validation.iterations.length}`, color: '#fbbf24' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="p-3 rounded-xl text-center animate-welcome"
                style={{
                  background: 'var(--crab-surface-raised)',
                  border: '1px solid var(--crab-border)',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-lg font-bold" style={{ color: 'var(--crab-text)' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: 'var(--crab-text-muted)' }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--crab-surface-raised)', border: '1px solid var(--crab-border)' }}
        >
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--crab-text)' }}>Score Comparison</h3>
          <ScoreChart iterations={validation.iterations} />
        </div>

        {/* Iteration selector */}
        <IterationCompare
          iterations={validation.iterations}
          selected={selectedIter}
          onSelect={setSelectedIter}
        />

        {/* Eval details */}
        {currentIter && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--crab-text)' }}>
              Iteration {currentIter.iteration}
              <span
                className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--crab-accent-light)', color: 'var(--crab-accent)' }}
              >
                Avg: {(currentIter.avgScore * 100).toFixed(0)}%
              </span>
            </h3>
            {currentIter.evalResults.map((r) => {
              const evalCase = evals.functional_evals.find(e => e.id === r.evalId);
              return (
                <EvalCard
                  key={r.evalId}
                  evalId={r.evalId}
                  prompt={evalCase?.prompt || ''}
                  withSkillOutput={r.withSkillOutput}
                  withoutSkillOutput={r.withoutSkillOutput}
                  grade={r.grade}
                  baselineGrade={r.baselineGrade}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
