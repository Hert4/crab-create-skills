import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export function StreamingMessage({ content }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5" />
    </div>
  );
}
