import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface Props {
  content: string;
}

export function StreamingMessage({ content }: Props) {
  return (
    <div style={{ flex: 1, minWidth: 0, fontSize: 14, overflowX: 'hidden' }}>
      <MarkdownRenderer content={content} />
      <span className="inline-block w-1.5 h-4 animate-pulse ml-0.5" style={{
        background: 'var(--crab-accent)',
        borderRadius: 2,
        verticalAlign: 'text-bottom',
      }} />
    </div>
  );
}
