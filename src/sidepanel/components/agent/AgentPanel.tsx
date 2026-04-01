import { useState } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bot, Copy, Check, Download, ChevronDown, ChevronUp, Wrench } from 'lucide-react';

/* ── Copy button ── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        border: '0.5px solid var(--crab-border)',
        background: copied ? 'var(--crab-accent-light)' : 'transparent',
        color: copied ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'var(--crab-bg-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-text)';
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-muted)';
        }
      }}
    >
      {copied ? <Check style={{ width: 10, height: 10 }} /> : <Copy style={{ width: 10, height: 10 }} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ── Collapsible section card ── */
function Card({
  label, badge, right, children, defaultOpen = true,
}: {
  label: string;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: '0.5px solid var(--crab-border)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--crab-surface-raised)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          padding: '7px 12px', gap: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '0.5px solid var(--crab-border)' : 'none',
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--crab-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1, textAlign: 'left',
        }}>
          {label}
        </span>
        {badge && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            background: 'var(--crab-accent-light)', color: 'var(--crab-accent)', fontWeight: 600,
          }}>
            {badge}
          </span>
        )}
        {right}
        {open
          ? <ChevronUp style={{ width: 12, height: 12, color: 'var(--crab-text-muted)', flexShrink: 0 }} />
          : <ChevronDown style={{ width: 12, height: 12, color: 'var(--crab-text-muted)', flexShrink: 0 }} />
        }
      </button>
      {open && children}
    </div>
  );
}

/* ── Config row ── */
function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--crab-text-muted)' }}>{label}</span>
      <span style={{
        fontSize: 11, color: 'var(--crab-text)', fontWeight: 500,
        fontFamily: (value.startsWith('gpt') || value.startsWith('claude') || value.startsWith('misa'))
          ? "'JetBrains Mono', monospace" : undefined,
      }}>
        {value || '—'}
      </span>
    </div>
  );
}

/* ── Download helpers ── */
function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportAll(agentTemplate: NonNullable<ReturnType<typeof useCompilationStore.getState>['agentTemplate']>) {
  const slug = agentTemplate.metadata.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { tools, systemPrompt, skillContent, config, metadata } = agentTemplate;

  downloadText(`${slug}-system_prompt.txt`, systemPrompt);
  downloadText(`${slug}-SKILL.md`, skillContent);
  if (tools.openai.length > 0)    downloadText(`${slug}-tools_openai.json`,    JSON.stringify(tools.openai, null, 2));
  if (tools.anthropic.length > 0) downloadText(`${slug}-tools_anthropic.json`, JSON.stringify(tools.anthropic, null, 2));
  if (tools.tools.length > 0)     downloadText(`${slug}-tools_openapi.yaml`,   tools.openapi);
  downloadText(`${slug}-config.json`, JSON.stringify({ metadata, config }, null, 2));

  const readme = `# ${metadata.name}\n\n**Domain:** ${metadata.domain}\n**Version:** ${metadata.version}\n**Description:** ${metadata.description}\n\nGenerated by Crab Create Skills\n`;
  downloadText(`${slug}-README.md`, readme);
}

/* ── Main component ── */
export function AgentPanel() {
  const agentTemplate = useCompilationStore(s => s.agentTemplate);
  const [exporting, setExporting] = useState(false);

  if (!agentTemplate) {
    return (
      <EmptyState
        icon={Bot}
        title="No Agent Template Yet"
        description="Run a compilation to generate a complete agent template with system prompt, tools, and config."
      />
    );
  }

  const { metadata, systemPrompt, config, tools } = agentTemplate;
  const toolCount = tools.tools.length;

  const handleExport = () => {
    setExporting(true);
    try { exportAll(agentTemplate); } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '0.5px solid var(--crab-border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Identity — name + version stacked, domain as subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bot style={{ width: 12, height: 12, color: 'var(--crab-accent)', flexShrink: 0 }} />
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--crab-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {metadata.name}
            </span>
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 8, flexShrink: 0,
              background: 'var(--crab-accent-light)', color: 'var(--crab-accent)', fontWeight: 700,
            }}>
              v{metadata.version}
            </span>
          </div>
          {metadata.domain && (
            <div style={{
              fontSize: 10, color: 'var(--crab-text-muted)', marginTop: 1, paddingLeft: 18,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {metadata.domain}
            </div>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            border: 'none',
            background: 'var(--crab-accent)',
            color: '#fff',
            cursor: exporting ? 'wait' : 'pointer',
            transition: 'opacity 0.15s',
            opacity: exporting ? 0.7 : 1,
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!exporting) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { if (!exporting) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <Download style={{ width: 11, height: 11 }} />
          {exporting ? 'Exporting…' : 'Export All'}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: '1 1 0', minHeight: 0, overflowY: 'auto',
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* Config */}
        <Card label="Config">
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ConfigRow label="Model"       value={config.model} />
            <ConfigRow label="Temperature" value={String(config.temperature)} />
            <ConfigRow label="Max tokens"  value={String(config.max_tokens)} />
            <ConfigRow label="Top P"       value={String(config.top_p)} />
            <ConfigRow label="Memory"      value={`${config.memory.type} · ${config.memory.max_turns} turns`} />
          </div>
        </Card>

        {/* System Prompt */}
        <Card label="System Prompt" right={<CopyBtn text={systemPrompt} />}>
          <pre style={{
            margin: 0, padding: '10px 12px',
            fontSize: 11, lineHeight: 1.7,
            color: 'var(--crab-text-secondary)',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 260, overflowY: 'auto',
          }}>
            {systemPrompt}
          </pre>
        </Card>

        {/* Tools */}
        {toolCount > 0 && (
          <Card label="Tools" badge={String(toolCount)}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tools.tools.map((tool, i) => (
                <div
                  key={tool.name}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 12px',
                    borderBottom: i < toolCount - 1 ? '0.5px solid var(--crab-border-subtle)' : 'none',
                  }}
                >
                  <Wrench style={{ width: 10, height: 10, color: 'var(--crab-accent)', marginTop: 3, flexShrink: 0, opacity: 0.6 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <code style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--crab-accent)', fontSize: 11, fontWeight: 600,
                      display: 'block', marginBottom: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tool.name}
                    </code>
                    <span style={{
                      fontSize: 11, color: 'var(--crab-text-muted)', lineHeight: 1.4,
                      display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tool.description}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ padding: '5px 12px 6px', borderTop: '0.5px solid var(--crab-border-subtle)' }}>
                <span style={{ fontSize: 10, color: 'var(--crab-text-muted)', fontStyle: 'italic' }}>
                  Full schemas in the Tools tab (OpenAI · Anthropic · OpenAPI)
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Export hint */}
        <div style={{
          padding: '7px 11px',
          border: '0.5px solid var(--crab-border)',
          borderRadius: 8, fontSize: 10.5,
          color: 'var(--crab-text-muted)', lineHeight: 1.7,
          background: 'var(--crab-bg-tertiary)',
        }}>
          <strong style={{ color: 'var(--crab-text-secondary)', fontWeight: 600 }}>Export All</strong>
          {' '}downloads:{' '}
          {[
            'system_prompt.txt', 'SKILL.md',
            ...(toolCount > 0 ? ['tools_openai.json', 'tools_anthropic.json', 'tools_openapi.yaml'] : []),
            'config.json', 'README.md',
          ].map((f, i, arr) => (
            <span key={f}>
              <code style={{ fontSize: 10 }}>{f}</code>
              {i < arr.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
