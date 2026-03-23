import { useState, useRef, useCallback } from 'react';
import { FileChip } from './FileChip';
import { useChatStore } from '@/stores/chatStore';
import { useCompilation } from '@/hooks/useCompilation';
import { parseFile } from '@/lib/file-parser';
import { Send, Paperclip, Square } from 'lucide-react';

export function ChatInput() {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { attachedFiles, attachFile, removeFile, isProcessing } = useChatStore();
  const { startCompilation, cancelCompilation } = useCompilation();

  const handleSend = useCallback(() => {
    if (isProcessing) {
      cancelCompilation();
      return;
    }
    if (!text.trim() && attachedFiles.length === 0) return;
    startCompilation(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, attachedFiles, isProcessing, startCompilation, cancelCompilation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const parsed = await parseFile(file);
        attachFile(parsed);
      } catch (err) {
        console.error('Failed to parse file:', err);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="px-3 pb-3 pt-2" style={{ borderTop: '0.5px solid var(--crab-border)' }}>
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachedFiles.map((f, i) => (
            <div key={i} className="animate-attachment">
              <FileChip name={f.name} type={f.type} size={f.size} onRemove={() => removeFile(i)} />
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        className="flex items-end gap-2 rounded-[22px] px-3 py-2 transition-all duration-300"
        style={{
          background: 'var(--crab-surface-overlay)',
          border: '1px solid var(--crab-border)',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{ color: 'var(--crab-text-muted)' }}
          onClick={() => fileRef.current?.click()}
          disabled={isProcessing}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message Crab..."
          rows={1}
          disabled={isProcessing}
          className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] leading-relaxed placeholder:text-[var(--crab-text-muted)]"
          style={{
            color: 'var(--crab-text)',
            minHeight: '24px',
            maxHeight: '120px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />

        <button
          className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-200"
          onClick={handleSend}
          style={isProcessing ? {
            background: 'var(--crab-accent)',
            color: 'white',
            animation: 'pulse-reply 1.5s ease-in-out infinite',
          } : {
            background: text.trim() || attachedFiles.length > 0 ? 'var(--crab-accent)' : 'var(--crab-bg-tertiary)',
            color: text.trim() || attachedFiles.length > 0 ? 'white' : 'var(--crab-text-muted)',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          }}
        >
          {isProcessing ? <Square className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
