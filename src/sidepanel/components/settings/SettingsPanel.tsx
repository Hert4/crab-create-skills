import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { RotateCcw } from 'lucide-react';

export function SettingsPanel() {
  const { settings, update } = useSettings();

  const isAnthropic = settings.provider === 'anthropic';
  const isOllama = settings.provider === 'ollama';

  const modelStrongPlaceholder = isAnthropic
    ? 'claude-opus-4-5'
    : isOllama ? 'llama3.1:70b' : 'gpt-4o';
  const modelFastPlaceholder = isAnthropic
    ? 'claude-haiku-4-5-20251001'
    : isOllama ? 'llama3.1:8b' : 'gpt-4o-mini';
  const apiKeyPlaceholder = isAnthropic ? 'sk-ant-...' : isOllama ? '(not required)' : 'sk-...';

  const inputStyle: React.CSSProperties = {
    background: 'var(--crab-surface-overlay)',
    border: '1px solid var(--crab-border)',
    color: 'var(--crab-text)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--crab-text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '4px',
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    background: 'var(--crab-surface-raised)',
    border: '1px solid var(--crab-border)',
    borderRadius: '16px',
    padding: '16px',
  };

  return (
    <div className="space-y-4 animate-welcome">
      {/* API Config */}
      <div style={sectionStyle}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--crab-text)' }}>API Configuration</h3>
        <div className="space-y-3">
          <div>
            <label style={labelStyle}>Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => {
                const provider = e.target.value as typeof settings.provider;
                const urlMap: Record<string, string> = {
                  openai: 'https://api.openai.com/v1',
                  anthropic: 'https://api.anthropic.com',
                  ollama: 'http://localhost:11434/v1',
                  'openai-compatible': settings.baseUrl,
                };
                update({ provider, baseUrl: urlMap[provider] ?? '' });
              }}
              style={inputStyle}
            >
              <option value="openai-compatible">OpenAI Compatible</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Base URL</label>
            <input
              value={settings.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
            />
          </div>
          <div>
            <label style={labelStyle}>API Key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={apiKeyPlaceholder}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label style={labelStyle}>Strong Model</label>
              <input
                value={settings.modelStrong}
                onChange={(e) => update({ modelStrong: e.target.value })}
                placeholder={modelStrongPlaceholder}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Fast Model</label>
              <input
                value={settings.modelFast}
                onChange={(e) => update({ modelFast: e.target.value })}
                placeholder={modelFastPlaceholder}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Eval Model <span style={{ color: 'var(--crab-text-muted)', fontWeight: 400 }}>(grading & test generation)</span></label>
            <input
              value={settings.modelEval}
              onChange={(e) => update({ modelEval: e.target.value })}
              placeholder="gpt-4o-mini (falls back to Fast Model if empty)"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
            />
          </div>
        </div>
      </div>

      {/* Validation */}
      <div style={sectionStyle}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--crab-text)' }}>Validation</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label style={labelStyle}>Max Iterations</label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.maxIterations}
                onChange={(e) => update({ maxIterations: parseInt(e.target.value) || 3 })}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Min Score</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={settings.minScore}
                onChange={(e) => update({ minScore: parseFloat(e.target.value) || 0.85 })}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--crab-accent)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--crab-border)'; }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Language</label>
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value as 'vi' | 'en' })}
              style={inputStyle}
            >
              <option value="vi">Vietnamese</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          border: '1px solid var(--crab-border)',
          color: 'var(--crab-text-muted)',
          background: 'transparent',
        }}
        onClick={() => update(DEFAULT_SETTINGS)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-accent)';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--crab-border)';
          (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-muted)';
        }}
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
      </button>
    </div>
  );
}
