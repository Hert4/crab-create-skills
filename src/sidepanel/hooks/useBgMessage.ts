import { useEffect } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { useChatStore } from '@/stores/chatStore';
import type { ToSidepanel } from '@/lib/types';

/**
 * Listen for messages from background.ts and update stores.
 */
export function useBgMessage() {
  const { setPhase, setSkill, setEvals, setValidation, setError } = useCompilationStore();
  const { addMessage, updateLastAssistant, setProcessing } = useChatStore();

  useEffect(() => {
    const handler = (msg: ToSidepanel) => {
      switch (msg.type) {
        case 'PROGRESS':
          setPhase(msg.phase, msg.detail, msg.progress);
          break;
        case 'CHAT_STREAM':
          updateLastAssistant(msg.delta);
          break;
        case 'SKILL_READY':
          setSkill(msg.skill);
          addMessage({ role: 'assistant', content: `Skill **${msg.skill.name}** created! Check the Preview tab.` });
          break;
        case 'EVALS_READY':
          setEvals(msg.evals);
          break;
        case 'VALIDATION_PROGRESS':
          setPhase('validate', `Iteration ${msg.iteration}: ${(msg.score * 100).toFixed(0)}%`);
          break;
        case 'DONE':
          setPhase('done', msg.result.detail, 100);
          setProcessing(false);
          if (msg.result.validation) setValidation(msg.result.validation);
          addMessage({ role: 'assistant', content: `Done! ${msg.result.detail}` });
          break;
        case 'ERROR':
          setError(msg.error);
          setProcessing(false);
          addMessage({ role: 'assistant', content: `Có lỗi xảy ra trong quá trình tạo skill. Xem thông báo lỗi bên trên để biết chi tiết.` });
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [setPhase, setSkill, setEvals, setValidation, setError, addMessage, updateLastAssistant, setProcessing]);
}
