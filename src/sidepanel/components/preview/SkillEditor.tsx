interface Props {
  content: string;
  onChange: (content: string) => void;
}

export function SkillEditor({ content, onChange }: Props) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 w-full resize-none border-0 outline-none p-4"
      style={{
        background: 'var(--crab-bg)',
        color: 'var(--crab-text)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        lineHeight: '1.6',
        minHeight: '100%',
      }}
    />
  );
}
