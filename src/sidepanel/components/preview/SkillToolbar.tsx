import { Copy, Download, Pencil, Eye } from 'lucide-react';

interface Props {
  isEditing: boolean;
  onToggleEdit: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function SkillToolbar({ isEditing, onToggleEdit, onCopy, onDownload }: Props) {
  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5"
      style={{ borderBottom: '0.5px solid var(--crab-border)', background: 'var(--crab-bg-secondary)' }}
    >
      {[
        { icon: isEditing ? Eye : Pencil, label: isEditing ? 'Preview' : 'Edit', onClick: onToggleEdit },
        { icon: Copy, label: 'Copy', onClick: onCopy },
        { icon: Download, label: 'Download', onClick: onDownload },
      ].map((btn, i) => {
        const Icon = btn.icon;
        return (
          <button
            key={i}
            onClick={btn.onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{ color: 'var(--crab-text-secondary)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--crab-bg-tertiary)';
              (e.currentTarget as HTMLElement).style.color = 'var(--crab-text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--crab-text-secondary)';
            }}
          >
            <Icon className="w-3.5 h-3.5" /> {btn.label}
          </button>
        );
      })}
    </div>
  );
}
