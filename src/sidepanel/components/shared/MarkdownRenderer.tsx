import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { Check, Copy } from 'lucide-react';

/* ── Copy button for code blocks ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 6,
        border: '0.5px solid var(--crab-border-strong)',
        background: 'var(--crab-bg-secondary)',
        color: copied ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.15s',
        lineHeight: 1,
        opacity: 0,
      }}
      className="copy-btn"
    >
      {copied
        ? <><Check size={11} strokeWidth={2.5} /> Copied</>
        : <><Copy size={11} strokeWidth={2} /> Copy</>
      }
    </button>
  );
}

/* ── Extract plain text from React children recursively ── */
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return extractText((children as React.ReactElement).props.children);
  }
  return '';
}

/* ── Extract language from className (rehype-highlight adds language-xxx) ── */
function extractLang(className?: string): string | null {
  const match = className?.match(/language-(\w+)/);
  return match ? match[1] : null;
}

/* ── Shared markdown components ── */
const makeComponents = (): Components => ({
  /* Code block */
  pre({ children, ...props }) {
    // Extract raw text + language from the inner <code> element
    const codeEl = Array.isArray(children) ? children[0] : children;
    const codeProps = (codeEl as React.ReactElement)?.props ?? {};
    const lang = extractLang(codeProps.className);
    const rawText = extractText(codeProps.children ?? children);

    return (
      <div
        style={{ position: 'relative' }}
        className="md-code-block"
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {/* Header bar: language label + copy button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px 0',
          background: 'var(--crab-bg-secondary)',
          borderRadius: '10px 10px 0 0',
          borderBottom: '0.5px solid var(--crab-border)',
        }}>
          <span style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--crab-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {lang ?? 'code'}
          </span>
          <CopyButton text={rawText} />
        </div>

        {/* The actual <pre> */}
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          background: 'var(--crab-bg-tertiary)',
          border: '0.5px solid var(--crab-border)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          overflowX: 'auto',
          fontSize: 12.5,
          lineHeight: 1.65,
        }}>
          {children}
        </pre>
      </div>
    );
  },

  /* Inline code */
  code({ children, className }) {
    const isBlock = !!extractLang(className);
    if (isBlock) {
      // Inside a <pre> — rendered by highlight.js, just pass through
      return (
        <code
          className={className}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'pre',
            wordBreak: 'normal',
          }}
        >
          {children}
        </code>
      );
    }
    return (
      <code style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: 'var(--crab-bg-tertiary)',
        border: '0.5px solid var(--crab-border)',
        padding: '1px 6px',
        borderRadius: 5,
        fontSize: '0.875em',
        color: 'var(--crab-accent-hover)',
        wordBreak: 'break-all',
      }}>
        {children}
      </code>
    );
  },

  /* Headings */
  h1: ({ children }) => (
    <h1 style={{
      fontSize: '1.2em',
      fontWeight: 650,
      color: 'var(--crab-text)',
      margin: '18px 0 8px',
      paddingBottom: '6px',
      borderBottom: '0.5px solid var(--crab-border)',
      letterSpacing: '-0.01em',
    }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{
      fontSize: '1.05em',
      fontWeight: 620,
      color: 'var(--crab-text)',
      margin: '14px 0 6px',
      letterSpacing: '-0.005em',
    }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      fontSize: '0.95em',
      fontWeight: 600,
      color: 'var(--crab-text)',
      margin: '10px 0 4px',
    }}>{children}</h3>
  ),

  /* Paragraph */
  p: ({ children }) => (
    <p style={{ margin: '5px 0', lineHeight: 1.65, wordBreak: 'break-word' }}>
      {children}
    </p>
  ),

  /* Lists */
  ul: ({ children }) => (
    <ul style={{
      margin: '6px 0',
      paddingLeft: 20,
      color: 'var(--crab-text-secondary)',
      lineHeight: 1.65,
    }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{
      margin: '6px 0',
      paddingLeft: 20,
      color: 'var(--crab-text-secondary)',
      lineHeight: 1.65,
    }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: '2px 0' }}>{children}</li>
  ),

  /* Blockquote */
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '3px solid var(--crab-accent)',
      background: 'var(--crab-bg-tertiary)',
      padding: '8px 14px',
      margin: '8px 0',
      borderRadius: '0 8px 8px 0',
      fontStyle: 'italic',
      color: 'var(--crab-text-secondary)',
    }}>{children}</blockquote>
  ),

  /* Table — scrollable wrapper, compact for narrow panel */
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0', borderRadius: 8, border: '0.5px solid var(--crab-border)' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85em',
        minWidth: 280,
      }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--crab-bg-secondary)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '6px 10px',
      textAlign: 'left',
      fontWeight: 600,
      fontSize: '0.82em',
      color: 'var(--crab-text-secondary)',
      borderBottom: '0.5px solid var(--crab-border)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '5px 10px',
      borderBottom: '0.5px solid var(--crab-border-subtle)',
      color: 'var(--crab-text-secondary)',
      verticalAlign: 'top',
      wordBreak: 'break-word',
    }}>{children}</td>
  ),

  /* Horizontal rule */
  hr: () => (
    <hr style={{
      border: 'none',
      borderTop: '0.5px solid var(--crab-border)',
      margin: '14px 0',
    }} />
  ),

  /* Link */
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--crab-accent-hover)',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(212, 119, 90, 0.4)',
      }}
    >{children}</a>
  ),

  /* Strong / em */
  strong: ({ children }) => (
    <strong style={{ color: 'var(--crab-text)', fontWeight: 650 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--crab-text-secondary)', fontStyle: 'italic' }}>{children}</em>
  ),
});

const COMPONENTS = makeComponents();
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeHighlight];

/* ── Public component ── */
interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={`md-root${className ? ` ${className}` : ''}`}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
