import { create } from 'zustand';
import type { CompilationState, Phase, SkillOutput, EvalSet, ValidationResult, AgentTemplate } from '../lib/types';
import { PHASE_ANIMATION, type AnimationId } from '../lib/animations';

type PipelineMode = 'compile' | 'optimize' | null;

interface Store extends CompilationState {
  pipelineMode: PipelineMode;
  setPipelineMode: (mode: PipelineMode) => void;
  setPhase: (phase: Phase, detail?: string, progress?: number, animation?: string) => void;
  setAnimation: (animation: AnimationId) => void;
  setSkill: (skill: SkillOutput) => void;
  setEvals: (evals: EvalSet) => void;
  setValidation: (v: ValidationResult) => void;
  setAgentTemplate: (agentTemplate: AgentTemplate) => void;
  updateSkillContent: (content: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const INITIAL: CompilationState & { pipelineMode: PipelineMode } = {
  phase: 'idle', progress: 0, detail: '', animation: 'clawd-idle-living', skill: null, evals: null, validation: null, agentTemplate: null, error: null, pipelineMode: null,
};

export const useCompilationStore = create<Store>((set) => ({
  ...INITIAL,
  setPipelineMode: (pipelineMode) => set({ pipelineMode }),
  setPhase: (phase, detail = '', progress = 0, animation?) =>
    set({ phase, detail, progress, animation: animation ?? PHASE_ANIMATION[phase], error: null }),
  setAnimation: (animation) => set({ animation }),
  setSkill: (skill) => set({ skill }),
  setEvals: (evals) => set({ evals }),
  setValidation: (validation) => set({ validation }),
  setAgentTemplate: (agentTemplate) => set({ agentTemplate }),
  updateSkillContent: (content) => set((s) => ({ skill: s.skill ? { ...s.skill, content } : null })),
  setError: (error) => set({ phase: 'error', error, animation: PHASE_ANIMATION.error }),
  reset: () => set(INITIAL),
}));
