import { FileText, Image, File, X } from 'lucide-react';

interface Props {
  name: string;
  type: string;
  size: number;
  onRemove?: () => void;
}

const icons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  image: Image,
  text: File,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export function FileChip({ name, type, size, onRemove }: Props) {
  const Icon = icons[type] || File;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all duration-200"
      style={{
        background: 'var(--crab-accent-light)',
        border: '1px solid var(--crab-border)',
        color: 'var(--crab-text-secondary)',
      }}
    >
      <Icon className="w-3 h-3" style={{ color: 'var(--crab-accent)' }} />
      <span className="max-w-[100px] truncate">{name}</span>
      <span style={{ color: 'var(--crab-text-muted)', fontSize: '10px' }}>{formatSize(size)}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 transition-colors duration-150 hover:bg-[rgba(201,100,66,0.2)]"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
