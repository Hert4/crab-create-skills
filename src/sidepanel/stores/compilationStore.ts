import { create } from 'zustand';
import type { CompilationState, Phase, SkillOutput, EvalSet, ValidationResult, AgentTemplate } from '../lib/types';

interface Store extends CompilationState {
  setPhase: (phase: Phase, detail?: string, progress?: number) => void;
  setSkill: (skill: SkillOutput) => void;
  setEvals: (evals: EvalSet) => void;
  setValidation: (v: ValidationResult) => void;
  setAgentTemplate: (agentTemplate: AgentTemplate) => void;
  updateSkillContent: (content: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const INITIAL: CompilationState = {
  phase: 'idle', progress: 0, detail: '', skill: null, evals: null, validation: null, agentTemplate: null, error: null,
};

export const useCompilationStore = create<Store>((set) => ({
  ...INITIAL,
  setPhase: (phase, detail = '', progress = 0) => set({ phase, detail, progress, error: null }),
  setSkill: (skill) => set({ skill }),
  setEvals: (evals) => set({ evals }),
  setValidation: (validation) => set({ validation }),
  setAgentTemplate: (agentTemplate) => set({ agentTemplate }),
  updateSkillContent: (content) => set((s) => ({ skill: s.skill ? { ...s.skill, content } : null })),
  setError: (error) => set({ phase: 'error', error }),
  reset: () => set(INITIAL),
}));
