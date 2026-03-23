import type { GradeResult } from '@/lib/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  evalId: number;
  prompt: string;
  withSkillOutput: string;
  withoutSkillOutput: string;
  grade: GradeResult;
  baselineGrade: GradeResult;
}

export function EvalCard({ evalId, prompt, withSkillOutput, withoutSkillOutput, grade, baselineGrade }: Props) {
  return (
    <div
      className="rounded-xl text-xs p-3 space-y-2 animate-message-in"
      style={{ background: 'var(--crab-surface-raised)', border: '1px solid var(--crab-border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: 'var(--crab-text)' }}>Eval #{evalId}</span>
        <div className="flex gap-1.5">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: grade.overall_score >= 0.8 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              color: grade.overall_score >= 0.8 ? '#4ade80' : '#f87171',
            }}
          >
            Skill: {(grade.overall_score * 100).toFixed(0)}%
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'var(--crab-bg-tertiary)', color: 'var(--crab-text-muted)' }}
          >
            Base: {(baselineGrade.overall_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div>
        <p className="mb-0.5" style={{ color: 'var(--crab-text-muted)' }}>Prompt</p>
        <p className="p-2 rounded-lg text-[11px]" style={{ background: 'var(--crab-bg-tertiary)', color: 'var(--crab-text-secondary)' }}>{prompt}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-0.5" style={{ color: 'var(--crab-text-muted)' }}>With Skill</p>
          <p className="p-2 rounded-lg text-[11px] max-h-[80px] overflow-auto" style={{ background: 'var(--crab-bg-tertiary)', color: 'var(--crab-text-secondary)' }}>{withSkillOutput.slice(0, 300)}</p>
        </div>
        <div>
          <p className="mb-0.5" style={{ color: 'var(--crab-text-muted)' }}>Baseline</p>
          <p className="p-2 rounded-lg text-[11px] max-h-[80px] overflow-auto" style={{ background: 'var(--crab-bg-tertiary)', color: 'var(--crab-text-secondary)' }}>{withoutSkillOutput.slice(0, 300)}</p>
        </div>
      </div>

      <div className="space-y-0.5">
        {grade.assertions.map((a, i) => (
          <div key={i} className="flex items-start gap-1.5">
            {a.passed ? (
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
            ) : (
              <XCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#f87171' }} />
            )}
            <span style={{ color: 'var(--crab-text-secondary)' }}>{a.text}</span>
          </div>
        ))}
      </div>

      {grade.feedback && (
        <p className="italic text-[11px]" style={{ color: 'var(--crab-text-muted)' }}>{grade.feedback}</p>
      )}
    </div>
  );
}
