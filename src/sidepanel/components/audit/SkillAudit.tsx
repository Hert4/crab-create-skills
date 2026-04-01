import { useCompilationStore } from '@/stores/compilationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { SopCard } from './SopCard';
import { PatchList } from './PatchList';
import { SkillDiff } from './SkillDiff';
import { FlaskConical, CheckCircle, XCircle, Route } from 'lucide-react';

export function SkillAudit() {
  const { evolution, validation } = useCompilationStore();

  if (!evolution) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No Evolution Data"
        description="Enable 'Trace2Skill Evolution' in Settings and compile a skill to see trajectory analysis."
      />
    );
  }

  const totalTrajectories = evolution.trajectories.length;
  const successCount = evolution.trajectories.filter(t => t.success).length;
  const failCount = totalTrajectories - successCount;
  const sopCount = evolution.sopPatterns.length;
  const totalPatches = evolution.patches.length;

  // Original skill content (before evolution) — from validation's finalSkillContent
  const originalContent = validation?.finalSkillContent ?? '';
  const evolvedContent = evolution.evolvedSkillContent ?? '';

  const stats = [
    { icon: Route,        label: 'Trajectories', value: `${totalTrajectories}`,    color: 'var(--crab-accent)' },
    { icon: CheckCircle,  label: 'Success',      value: `${successCount}`,         color: '#4ade80' },
    { icon: XCircle,      label: 'Failures',     value: `${failCount}`,            color: '#f87171' },
    { icon: FlaskConical, label: 'SoPs Learned', value: `${sopCount}`,             color: '#a78bfa' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-4">

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="p-2 rounded-xl text-center animate-welcome"
                style={{
                  background: 'var(--crab-surface-raised)',
                  border: '1px solid var(--crab-border)',
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-base font-bold" style={{ color: 'var(--crab-text)' }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: 'var(--crab-text-muted)' }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* SoP Patterns */}
        {sopCount > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--crab-text)' }}>
              SoP Patterns Learned
              <span
                className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--crab-accent-light)', color: 'var(--crab-accent)' }}
              >
                {sopCount} pattern{sopCount > 1 ? 's' : ''}
              </span>
            </h3>
            <div className="space-y-2">
              {evolution.sopPatterns.map((pattern, i) => (
                <SopCard key={i} pattern={pattern} totalPatches={totalPatches} />
              ))}
            </div>
          </section>
        )}

        {/* Patch Analysis */}
        {totalPatches > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--crab-text)' }}>
              Patch Analysis
              <span
                className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--crab-surface-raised)', border: '1px solid var(--crab-border)', color: 'var(--crab-text-muted)' }}
              >
                {evolution.patchesApplied} applied · {evolution.patchesRejected} rejected
              </span>
            </h3>
            <PatchList patches={evolution.patches} />
          </section>
        )}

        {/* Skill Diff */}
        {originalContent && (
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--crab-text)' }}>
              Skill Evolution Diff
            </h3>
            <SkillDiff originalContent={originalContent} evolvedContent={evolvedContent} />
          </section>
        )}

      </div>
    </div>
  );
}
