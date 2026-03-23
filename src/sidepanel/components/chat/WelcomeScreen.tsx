import { FileText, MessageSquare, Image, Sparkles } from 'lucide-react';
import { CrabMascotWelcome } from '@/components/shared/CrabMascot';

const SUGGESTIONS = [
  { icon: FileText, text: 'Upload a PDF with business process', color: '#c96442' },
  { icon: MessageSquare, text: 'Describe a workflow in chat', color: '#4ade80' },
  { icon: Image, text: 'Upload a flowchart screenshot', color: '#fbbf24' },
  { icon: Sparkles, text: 'Generate skill from scratch', color: '#a78bfa' },
];

export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 animate-welcome">
      {/* Crab mascot */}
      <div style={{ marginBottom: 20, position: 'relative', display: 'inline-block' }}>
        <CrabMascotWelcome />
      </div>

      <h2
        className="text-lg font-semibold mb-1"
        style={{ color: 'var(--crab-text)' }}
      >
        Create Agent Skills
      </h2>
      <p
        className="text-sm text-center mb-6 max-w-[260px]"
        style={{ color: 'var(--crab-text-muted)' }}
      >
        Upload documents or describe a process. Crab will turn it into a production-ready skill.
      </p>

      {/* Suggestion grid */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-200"
              style={{
                background: 'var(--crab-surface-raised)',
                border: '1px solid var(--crab-border)',
                color: 'var(--crab-text-secondary)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--crab-accent)';
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow = '0 0 12px rgba(201, 100, 66, 0.15)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--crab-border)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: s.color }} />
              <span>{s.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
