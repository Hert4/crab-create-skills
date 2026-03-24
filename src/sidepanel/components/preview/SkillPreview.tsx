import { useState, useCallback } from 'react';
import { SkillToolbar } from './SkillToolbar';
import { SkillEditor } from './SkillEditor';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { useCompilationStore } from '@/stores/compilationStore';
import { FileText } from 'lucide-react';

export function SkillPreview() {
  const { skill, updateSkillContent } = useCompilationStore();
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = useCallback(() => {
    if (skill) navigator.clipboard.writeText(skill.content);
  }, [skill]);

  const handleDownload = useCallback(() => {
    if (!skill) return;
    const blob = new Blob([skill.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [skill]);

  if (!skill) {
    return (
      <EmptyState
        icon={FileText}
        title="No Skill Yet"
        description="Upload a document or describe a process in the Chat tab to generate a skill."
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SkillToolbar
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />

      {isEditing ? (
        <SkillEditor content={skill.content} onChange={updateSkillContent} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <MarkdownRenderer content={skill.content} />
        </div>
      )}
    </div>
  );
}
