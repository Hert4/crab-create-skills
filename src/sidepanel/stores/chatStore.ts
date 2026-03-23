import { create } from 'zustand';
import type { ChatMessage, ParsedFile } from '../lib/types';

const WELCOME_MSG: ChatMessage = {
  id: 'welcome', role: 'assistant', timestamp: Date.now(),
  content: 'Hey! I\'m Crab. Upload a document or tell me about your business process - I\'ll turn it into a skill.',
};

interface Store {
  messages: ChatMessage[];
  attachedFiles: ParsedFile[];
  isProcessing: boolean;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistant: (content: string) => void;
  attachFile: (f: ParsedFile) => void;
  removeFile: (i: number) => void;
  clearFiles: () => void;
  setProcessing: (v: boolean) => void;
  newChat: () => void;
}

export const useChatStore = create<Store>((set) => ({
  messages: [{ ...WELCOME_MSG }],
  attachedFiles: [],
  isProcessing: false,

  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }],
  })),
  updateLastAssistant: (content) => set((s) => {
    const msgs = [...s.messages];
    const i = msgs.findLastIndex(m => m.role === 'assistant');
    if (i >= 0) msgs[i] = { ...msgs[i], content, isStreaming: true };
    return { messages: msgs };
  }),
  attachFile: (f) => set((s) => s.attachedFiles.length >= 4 ? s : { attachedFiles: [...s.attachedFiles, f] }),
  removeFile: (i) => set((s) => ({ attachedFiles: s.attachedFiles.filter((_, idx) => idx !== i) })),
  clearFiles: () => set({ attachedFiles: [] }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  newChat: () => set({
    messages: [{ ...WELCOME_MSG, id: 'welcome-' + Date.now(), timestamp: Date.now() }],
    attachedFiles: [],
    isProcessing: false,
  }),
}));
