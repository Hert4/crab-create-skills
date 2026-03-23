import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseFile } from '@/lib/file-parser';
import { useChatStore } from '@/stores/chatStore';

export function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { attachFile } = useChatStore();

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      try {
        const parsed = await parseFile(file);
        attachFile(parsed);
      } catch (err) {
        console.error('Failed to parse file:', err);
      }
    }
  }, [attachFile]);

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Drop files here (PDF, DOCX, images)
      </p>
    </div>
  );
}
