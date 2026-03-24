import { useState } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wrench, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { DetectedTool } from '@/lib/types';

type SchemaFormat = 'openai' | 'anthropic' | 'openapi';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        border: '1px solid var(--crab-border)',
        background: copied ? 'var(--crab-accent-light)' : 'var(--crab-bg-hover)',
        color: copied ? 'var(--crab-accent)' : 'var(--crab-text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ToolCard({ tool }: { tool: DetectedTool }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: 'var(--crab-surface-raised)',
      border: '1px solid var(--crab-border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        {expanded
          ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--crab-accent)', flexShrink: 0 }} />
          : <ChevronRight style={{ width: 14, height: 14, color: 'var(--crab-text-muted)', flexShrink: 0 }} />
        }
        <span style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12, fontWeight: 600, color: 'var(--crab-accent)',
        }}>
          {tool.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--crab-text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
          {tool.parameters.filter(p => p.required).length} required params
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--crab-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--crab-text-secondary)', margin: '8px 0 4px' }}>
            {tool.description}
          </p>
          <p style={{ fontSize: 11, color: 'var(--crab-text-muted)', margin: '0 0 8px', fontStyle: 'italic' }}>
            Trigger: {tool.trigger}
          </p>

          {tool.parameters.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crab-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tool.parameters.map(p => (
                  <div key={p.name} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    background: 'var(--crab-surface-overlay)',
                    borderRadius: 6, padding: '4px 8px', fontSize: 11,
                  }}>
                    <code style={{ color: 'var(--crab-accent)', fontWeight: 600, minWidth: 80 }}>{p.name}</code>
                    <span style={{ color: 'var(--crab-text-muted)', minWidth: 48 }}>{p.type}</span>
                    <span style={{ color: 'var(--crab-text-secondary)', flex: 1 }}>{p.description}</span>
                    {p.required && (
                      <span style={{ color: '#f87171', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--crab-text-muted)' }}>
            Returns: {tool.returns}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolsPanel() {
  const agentTemplate = useCompilationStore(s => s.agentTemplate);
  const toolOutput = agentTemplate?.tools;
  const preferred = toolOutput?.preferredFormat ?? 'openai';
  const [activeFormat, setActiveFormat] = useState<SchemaFormat>(preferred);

  if (!agentTemplate) {
    return (
      <EmptyState
        icon={Wrench}
        title="No Tools Yet"
        description="Run a compilation to automatically detect tools from your document."
      />
    );
  }

  const { tools } = agentTemplate.tools;

  if (tools.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No Tools Detected"
        description="This workflow operates through reasoning only — no external API calls were identified."
      />
    );
  }

  const schemaContent = activeFormat === 'openai'
    ? JSON.stringify(toolOutput!.openai, null, 2)
    : activeFormat === 'anthropic'
      ? JSON.stringify(toolOutput!.anthropic, null, 2)
      : toolOutput!.openapi;

  const formatTabs: { id: SchemaFormat; label: string }[] = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openapi', label: 'OpenAPI 3.0' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--crab-border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wrench style={{ width: 14, height: 14, color: 'var(--crab-accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--crab-text)' }}>
            {tools.length} Tool{tools.length !== 1 ? 's' : ''} Detected
          </span>
        </div>
      </div>

      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Tool cards */}
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tools.map(tool => <ToolCard key={tool.name} tool={tool} />)}
        </div>

        {/* Schema export */}
        <div style={{
          margin: '0 12px 12px',
          background: 'var(--crab-surface-raised)',
          border: '1px solid var(--crab-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Format tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid var(--crab-border)',
            background: 'var(--crab-surface-overlay)',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {formatTabs.map(tab => {
                const isPreferred = tab.id === preferred;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFormat(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      border: '1px solid',
                      borderColor: activeFormat === tab.id ? 'var(--crab-accent)' : 'transparent',
                      background: activeFormat === tab.id ? 'var(--crab-accent-light)' : 'transparent',
                      color: activeFormat === tab.id ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                    {isPreferred && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
                        padding: '1px 4px', borderRadius: 4,
                        background: activeFormat === tab.id ? 'var(--crab-accent)' : 'var(--crab-bg-hover)',
                        color: activeFormat === tab.id ? '#fff' : 'var(--crab-accent)',
                      }}>
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <CopyButton text={schemaContent} />
          </div>

          {/* Schema content */}
          <pre style={{
            margin: 0, padding: '10px 12px',
            fontSize: 11, lineHeight: 1.6,
            color: 'var(--crab-text-secondary)',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            overflowX: 'auto',
            maxHeight: 280,
            overflowY: 'auto',
            whiteSpace: 'pre',
          }}>
            <code>{schemaContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
