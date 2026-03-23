import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { useChatStore } from '@/stores/chatStore';

export function ChatPanel() {
  const messages = useChatStore(s => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const showWelcome = messages.length <= 1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
      {/* Scrollable messages area — flex:1 + min-height:0 is the key */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {showWelcome ? (
          <WelcomeScreen />
        ) : (
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      {/* Input — always at bottom, never scrolls */}
      <ChatInput />
    </div>
  );
}
