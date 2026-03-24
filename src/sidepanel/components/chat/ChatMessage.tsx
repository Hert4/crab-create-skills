import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { FileChip } from './FileChip';

// Compact crab — no offset padding, just the body shape
const CRAB_MINI = `████████\n█▌▐██▌▐█\n████████\n ▐▐  ▌▌`;

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      isUser ? 'flex justify-end animate-user-in px-4 py-1' : 'animate-message-in',
    )}>
      {isUser ? (
        /* User bubble — pill, right-aligned */
        <div
          style={{
            maxWidth: '80%',
            borderRadius: 20,
            padding: '10px 16px',
            fontSize: 14,
            background: 'var(--crab-bg-tertiary)',
            color: 'var(--crab-text)',
            wordBreak: 'break-word',
          }}
        >
          {message.files && message.files.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {message.files.map((f, i) => (
                <FileChip key={i} name={f.name} type={f.type} size={f.size} />
              ))}
            </div>
          )}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{message.content}</p>
        </div>
      ) : (
        /* Assistant message — full width */
        <div
          style={{
            padding: '12px 16px',
            borderTop: '0.5px solid var(--crab-border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          {/* Mini crab icon — flush, no offset */}
          <pre style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            lineHeight: 1.1,
            color: 'var(--crab-accent)',
            userSelect: 'none',
            margin: 0,
            flexShrink: 0,
            opacity: 0.85,
            paddingTop: 2,
          }}>
            {CRAB_MINI}
          </pre>

          {/* Message content */}
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, overflowX: 'hidden' }}>
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && (
              <span className="thinking-dots mt-1 inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
