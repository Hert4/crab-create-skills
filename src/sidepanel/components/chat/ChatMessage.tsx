import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
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
            <div
              className="prose-crab"
              style={{ overflowX: 'hidden', wordBreak: 'break-word' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => (
                    <pre style={{
                      overflowX: 'auto',
                      maxWidth: '100%',
                      background: 'var(--crab-bg-tertiary)',
                      border: '0.5px solid var(--crab-border)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      margin: '8px 0',
                      fontSize: 12,
                    }}>
                      {children}
                    </pre>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <code style={{ fontFamily: "'JetBrains Mono', monospace", display: 'block', overflowX: 'auto', wordBreak: 'normal', whiteSpace: 'pre' }}>
                        {children}
                      </code>
                    ) : (
                      <code style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: 'var(--crab-bg-tertiary)',
                        padding: '1px 5px',
                        borderRadius: 5,
                        fontSize: 12,
                        color: 'var(--crab-accent-hover)',
                        wordBreak: 'break-all',
                      }}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => (
                    <p style={{ margin: '4px 0', lineHeight: 1.6, wordBreak: 'break-word' }}>{children}</p>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
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
