import { useChatStore } from '@/stores/chatStore';
import { useCompilationStore } from '@/stores/compilationStore';
import { useSettings } from '@/hooks/useSettings';

const COMPILE_KEYWORDS = [
  'skill', 'tạo', 'create', 'quy trình', 'process', 'workflow',
  'nghiệp vụ', 'business', 'generate', 'compile', 'build',
  'document', 'tài liệu', 'file', 'pdf', 'docx',
];

function shouldCompile(message: string, hasFiles: boolean): boolean {
  if (hasFiles) return true;
  const lower = message.toLowerCase();
  return COMPILE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function useCompilation() {
  const { addMessage, attachedFiles, clearFiles, setProcessing } = useChatStore();
  const { reset, setError } = useCompilationStore();
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
    const isCompile = shouldCompile(userMessage, hasFiles);

    // Add user message to chat
    addMessage({
      role: 'user',
      content: userMessage,
      files: hasFiles ? attachedFiles : undefined,
    });

    if (isCompile) {
      // Full compilation pipeline
      addMessage({ role: 'assistant', content: 'Processing...' });
      setProcessing(true);
      reset();

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
      // Simple chat
      setProcessing(true);
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'CHAT',
          data: { message: userMessage },
        });
        if (response?.ok) {
          addMessage({ role: 'assistant', content: response.reply });
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
    setProcessing(false);
  };

  return { startCompilation, cancelCompilation };
}
