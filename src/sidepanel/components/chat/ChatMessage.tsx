import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { FileChip } from './FileChip';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  message: ChatMessageType;
}

/**
 * Split assistant message content into:
 * - "log lines": lines that start with `[tag]` pattern (debug/progress from dbg())
 * - "main content": everything else
 *
 * Log lines are collapsed into a small expandable badge.
 */
function splitContent(content: string): { main: string; logs: string[] } {
  const lines = content.split('\n');
  const logs: string[] = [];
  const mainLines: string[] = [];

  for (const line of lines) {
    // Match lines like: `[ingest]` some message
    if (/^\s*`\[[\w-]+\]`/.test(line)) {
      logs.push(line.trim());
    } else {
      mainLines.push(line);
    }
  }

  // Trim leading/trailing blank lines from main
  const main = mainLines.join('\n').replace(/^\n+|\n+$/g, '');
  return { main, logs };
}

/** Collapsible debug log block */
function LogBlock({ logs }: { logs: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ margin: '6px 0' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px 2px 6px',
          borderRadius: 6,
          border: '0.5px solid var(--crab-border)',
          background: 'var(--crab-bg-tertiary)',
          color: 'var(--crab-text-muted)',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          cursor: 'pointer',
          transition: 'all 0.15s',
          letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-border-strong)';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-secondary)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-muted)';
        }}
      >
        {open
          ? <ChevronDown style={{ width: 11, height: 11 }} />
          : <ChevronRight style={{ width: 11, height: 11 }} />
        }
        <span style={{ color: 'var(--crab-accent)', opacity: 0.7 }}>debug</span>
        <span style={{ marginLeft: 2 }}>{logs.length} lines</span>
      </button>

      {open && (
        <div style={{
          marginTop: 4,
          padding: '8px 10px',
          borderRadius: 8,
          border: '0.5px solid var(--crab-border)',
          background: 'var(--crab-bg-tertiary)',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--crab-text-muted)',
          lineHeight: 1.6,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          maxHeight: 300,
          overflowY: 'auto',
        }}>
          {logs.map((line, i) => {
            // Strip the leading `[tag]` backtick wrapper for cleaner display
            const clean = line.replace(/^`\[([\w-]+)\]`\s*/, (_, tag) => `[${tag}] `);
            return <div key={i}>{clean}</div>;
          })}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className={cn('flex justify-end animate-user-in px-4 py-1')}>
        <div style={{
          maxWidth: '80%',
          borderRadius: 20,
          padding: '10px 16px',
          fontSize: 14,
          background: 'var(--crab-bg-tertiary)',
          color: 'var(--crab-text)',
          wordBreak: 'break-word',
        }}>
          {message.files && message.files.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {message.files.map((f, i) => (
                <FileChip key={i} name={f.name} type={f.type} size={f.size} />
              ))}
            </div>
          )}
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message — split logs out
  const { main, logs } = splitContent(message.content);

  return (
    <div className="animate-message-in">
      <div style={{
        padding: '10px 16px 10px 16px',
        borderTop: '0.5px solid var(--crab-border-subtle)',
      }}>
        {/* Main readable content */}
        {main && (
          <div style={{ fontSize: 14, overflowX: 'hidden' }}>
            <MarkdownRenderer content={main} />
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && !main && (
          <span className="thinking-dots inline-flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--crab-accent)' }} />
          </span>
        )}

        {/* Collapsible debug logs */}
        {logs.length > 0 && <LogBlock logs={logs} />}

        {/* Cursor when streaming after content */}
        {message.isStreaming && main && (
          <span className="inline-block w-1.5 h-3.5 animate-pulse ml-0.5 align-middle" style={{
            background: 'var(--crab-accent)',
            borderRadius: 2,
            opacity: 0.7,
          }} />
        )}
      </div>
    </div>
  );
}
