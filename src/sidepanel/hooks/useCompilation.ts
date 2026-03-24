import { useChatStore } from '@/stores/chatStore';
import { useCompilationStore } from '@/stores/compilationStore';
import { useSettings } from '@/hooks/useSettings';
import type { AnimationId } from '@/lib/animations';

export function useCompilation() {
  const { addMessage, attachedFiles, clearFiles, setProcessing, messages } = useChatStore();
  const { reset, setError, setPhase, setAnimation, setPipelineMode } = useCompilationStore();
  // Use selectors for reactive values
  const skill = useCompilationStore(s => s.skill);
  const agentTemplate = useCompilationStore(s => s.agentTemplate);
  const { settings } = useSettings();

  const startCompilation = async (userMessage: string) => {
    if (!userMessage.trim() && attachedFiles.length === 0) return;

    // Check settings configured before starting pipeline
    if (!settings.baseUrl || !settings.modelStrong || !settings.modelFast) {
      setError('Base URL, Strong Model và Fast Model chưa được cấu hình. Vui lòng vào Settings để thiết lập.');
      addMessage({ role: 'assistant', content: 'Bạn chưa cấu hình API. Vui lòng vào Settings để điền Base URL, API Key và tên model.' });
      return;
    }

    const hasFiles = attachedFiles.length > 0;

    // Add user message to chat
    addMessage({
      role: 'user',
      content: userMessage,
      files: hasFiles ? attachedFiles : undefined,
    });

    // If files attached → always compile. Otherwise ask background to classify intent.
    let isCompile = hasFiles;
    let isOptimize = false;
    if (!isCompile) {
      try {
        const r = await chrome.runtime.sendMessage({
          type: 'CLASSIFY',
          data: { message: userMessage },
        });
        isOptimize = r?.optimize === true;
        isCompile = !isOptimize && r?.compile === true;
      } catch {
        isCompile = true;
      }
    }

    // ── OPTIMIZE PROMPT (full pipeline with evals) ──────────────────────────
    if (isOptimize) {
      addMessage({ role: 'assistant', content: 'Optimizing prompt...' });
      setProcessing(true);
      reset();
      setPipelineMode('optimize');

      try {
        await chrome.runtime.sendMessage({
          type: 'OPTIMIZE_PROMPT',
          data: { skillContent: userMessage },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        addMessage({ role: 'assistant', content: `Lỗi kết nối: ${msg}` });
        setProcessing(false);
      }
      clearFiles();
      return;
    }

    if (isCompile) {
      // Full compilation pipeline
      addMessage({ role: 'assistant', content: 'Processing...' });
      setProcessing(true);
      reset();
      setPipelineMode('compile');

      try {
        await chrome.runtime.sendMessage({
          type: 'COMPILE',
          data: { files: attachedFiles, userMessage },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        addMessage({ role: 'assistant', content: `Lỗi kết nối: ${msg}` });
        setProcessing(false);
      }
    } else {
      // Simple chat — include conversation history + compilation context
      setProcessing(true);
      try {
        // Build history: exclude welcome msg, system msgs, streaming msgs, keep last 20
        const history = messages
          .filter(m => m.role !== 'system' && !m.isStreaming && m.id !== 'welcome' && !m.id.startsWith('welcome-'))
          .slice(-20)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const toolCount = agentTemplate?.tools.tools.length ?? 0;
        const contextLines: string[] = [];
        if (skill) {
          contextLines.push(`Current compiled skill: "${skill.name}" (${skill.intent.skill_type}, domain: ${skill.intent.domain})`);
          contextLines.push(`Steps: ${skill.steps.steps.length}, Hard rules: ${skill.constraints.hard_rules.length}`);
        }
        if (agentTemplate) {
          contextLines.push(`Tools detected: ${toolCount > 0 ? toolCount + ' tools (' + agentTemplate.tools.tools.map(t => t.name).join(', ') + ')' : 'none — pure reasoning skill, no external API calls needed'}`);
          contextLines.push(`Agent system prompt: ready`);
        }
        const context = contextLines.length > 0
          ? `\n\nCurrent session context:\n${contextLines.join('\n')}`
          : '';

        const response = await chrome.runtime.sendMessage({
          type: 'CHAT',
          data: { message: userMessage, context, history },
        });
        if (response?.ok) {
          addMessage({ role: 'assistant', content: response.reply });
          if (response.animation) setAnimation(response.animation as AnimationId);
        } else {
          const errMsg = response?.error || 'Unknown error';
          setError(errMsg);
          addMessage({ role: 'assistant', content: `Lỗi: ${errMsg}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        addMessage({ role: 'assistant', content: `Lỗi kết nối: ${msg}` });
      }
      setProcessing(false);
    }

    clearFiles();
  };

  const cancelCompilation = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CANCEL' });
    } catch { /* ignore */ }
    // Reset UI state immediately — don't wait for background to acknowledge
    setProcessing(false);
    setPhase('idle', '', 0);
  };

  return { startCompilation, cancelCompilation };
}
