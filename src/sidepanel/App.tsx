import { useState } from 'react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SkillPreview } from '@/components/preview/SkillPreview';
import { EvalDashboard } from '@/components/evals/EvalDashboard';
import { ToolsPanel } from '@/components/tools/ToolsPanel';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { HistoryList } from '@/components/history/HistoryList';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ProgressStepper } from '@/components/shared/ProgressStepper';
import { ErrorToast } from '@/components/shared/ErrorToast';
import { useCompilationStore } from '@/stores/compilationStore';
import { useChatStore } from '@/stores/chatStore';
import { useBgMessage } from '@/hooks/useBgMessage';
import { MessageSquare, Eye, BarChart3, Wrench, Bot, Clock, Settings, SquarePen } from 'lucide-react';
import { CrabMascot, CrabLogoAscii } from '@/components/shared/CrabMascot';

const TABS = [
  { id: 'chat',     icon: MessageSquare, title: 'Chat' },
  { id: 'preview',  icon: Eye,           title: 'Preview' },
  { id: 'evals',    icon: BarChart3,     title: 'Evals' },
  { id: 'tools',    icon: Wrench,        title: 'Tools' },
  { id: 'agent',    icon: Bot,           title: 'Agent' },
  { id: 'history',  icon: Clock,         title: 'History' },
  { id: 'settings', icon: Settings,      title: 'Settings' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function App() {
  const phase = useCompilationStore(s => s.phase);
  const { reset: resetCompilation } = useCompilationStore();
  const { newChat } = useChatStore();
  const msgCount = useChatStore(s => s.messages.length);
  const showWelcomeCrab = msgCount <= 1; // WelcomeScreen (big crab) is visible
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  useBgMessage();

  const handleNewChat = () => {
    newChat();
    resetCompilation();
    setActiveTab('chat');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      minHeight: 0,
      background: 'var(--crab-bg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header — logo + brand + new chat */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px 4px 12px',
        borderBottom: '0.5px solid var(--crab-border)',
        background: 'color-mix(in srgb, var(--crab-bg-secondary) 85%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: '40px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CrabLogoAscii />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--crab-accent)', letterSpacing: '-0.01em' }}>Crab</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--crab-text-muted)', letterSpacing: '-0.01em' }}>create skills</span>
        </div>

        <button
          onClick={handleNewChat}
          title="New chat"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--crab-text-muted)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--crab-bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--crab-text)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--crab-text-muted)';
          }}
        >
          <SquarePen style={{ width: 14, height: 14 }} />
        </button>
      </header>

      {/* Nav bar — full width row, icons always fit */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '2px 6px',
        borderBottom: '0.5px solid var(--crab-border)',
        background: 'color-mix(in srgb, var(--crab-bg-secondary) 70%, transparent)',
        flexShrink: 0,
        gap: 2,
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '1 1 0',
                height: 30,
                background: isActive ? 'var(--crab-accent-light)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: isActive ? 'var(--crab-accent)' : 'var(--crab-text-muted)',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                minWidth: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--crab-bg-hover)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--crab-text)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--crab-text-muted)';
                }
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
            </button>
          );
        })}
      </nav>

      {/* Progress stepper — only when compiling */}
      {phase !== 'idle' && phase !== 'error' && <ProgressStepper />}

      {/* Content — flex:1, min-height:0 is CRITICAL for scroll to work */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: activeTab === 'chat'     ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><ChatPanel /></div>
        <div style={{ display: activeTab === 'preview'  ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><SkillPreview /></div>
        <div style={{ display: activeTab === 'evals'    ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><EvalDashboard /></div>
        <div style={{ display: activeTab === 'tools'    ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><ToolsPanel /></div>
        <div style={{ display: activeTab === 'agent'    ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><AgentPanel /></div>
        <div style={{ display: activeTab === 'history'  ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}><HistoryList /></div>
        <div style={{ display: activeTab === 'settings' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: 16 }}><SettingsPanel /></div>
      </div>

      {/* Floating ASCII mascot — only visible on chat tab when big welcome crab is NOT shown */}
      {activeTab === 'chat' && !showWelcomeCrab && <CrabMascot />}

      {/* Error toast — overlays content, auto-dismiss */}
      <ErrorToast onNavigate={(tab) => setActiveTab(tab as TabId)} />
    </div>
  );
}
