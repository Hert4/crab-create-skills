import { useEffect } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { useChatStore } from '@/stores/chatStore';
import type { ToSidepanel } from '@/lib/types';

/**
 * Listen for messages from background.ts and update stores.
 */
export function useBgMessage() {
  const { setPhase, setSkill, setEvals, setValidation, setAgentTemplate, setError } = useCompilationStore();
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
        case 'AGENT_READY': {
          setAgentTemplate(msg.agentTemplate);
          const toolCount = msg.agentTemplate.tools.tools.length;
          const toolMsg = toolCount > 0
            ? `Found **${toolCount} tool${toolCount > 1 ? 's' : ''}** — see the **Tools** tab for schemas (OpenAI / Anthropic / OpenAPI).`
            : `No external tools detected — this skill works through reasoning only (no API calls needed).`;
          addMessage({ role: 'assistant', content: `Agent template ready! ${toolMsg}\n\nCheck the **Agent** tab to preview the system prompt and export all files.` });
          break;
        }
        case 'DONE':
          setPhase('done', msg.result.detail, 100);
          setProcessing(false);
          if (msg.result.validation) setValidation(msg.result.validation);
          addMessage({ role: 'assistant', content: `Done! ${msg.result.detail}` });
          break;
        case 'ERROR':
          setError(msg.error);
          setProcessing(false);
          addMessage({ role: 'assistant', content: `❌ **Lỗi:** \`${msg.error}\`\n\nKiểm tra console (F12 → Service Worker) để xem chi tiết.` });
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [setPhase, setSkill, setEvals, setValidation, setAgentTemplate, setError, addMessage, updateLastAssistant, setProcessing]);
}
