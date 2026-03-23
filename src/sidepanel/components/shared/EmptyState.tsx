import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-welcome">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--crab-accent-light)', border: '1px solid var(--crab-border)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--crab-accent)' }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'var(--crab-text)' }}>{title}</h3>
      <p className="text-sm max-w-[240px]" style={{ color: 'var(--crab-text-muted)' }}>{description}</p>
    </div>
  );
}
