import { MessageWithFields } from "../types";

export interface SavedChat {
  id: string;
  messages: MessageWithFields[];
  lastUpdated: number;
  title: string;
  isPseudoEntry?: boolean;
}

const CHATS_KEY = 'cip-chat-history';

// Add interfaces for draft storage
interface ChatDraft {
  inputValue: string;
  lastUpdated: number;
}

const DRAFTS_KEY = 'cip-chat-drafts';

// Add this constant
export const NEW_CHAT_ID = 'new-chat';

// Helper to generate a title from the first few messages
export function generateTitle(messages: MessageWithFields[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')?.content;
  if (firstUserMessage) {
    return firstUserMessage.slice(0, 40) + (firstUserMessage.length > 40 ? '...' : '');
  }
  return `Chat ${new Date().toLocaleDateString()}`;
}

// Format time ago
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit.charAt(0)}`;  // e.g., "3h", "2d", "1w"
    }
  }
  
  return 'now';
}

// Save a chat to localStorage
export function saveChat(chatId: string, messages: MessageWithFields[], title?: string): void {
  if (typeof window === 'undefined') return;
  
  const chats = getChats();
  const existingChat = chats[chatId];
  
  chats[chatId] = {
    id: chatId,
    messages,
    lastUpdated: Date.now(),
    title: title || existingChat?.title || generateTitle(messages)
  };
  
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

// Get all chats from localStorage
export function getChats(): Record<string, SavedChat> {
  if (typeof window === 'undefined') return {};
  const chats = localStorage.getItem(CHATS_KEY);
  return chats ? JSON.parse(chats) : {};
}

// Get a specific chat
export function getChat(chatId: string): SavedChat | null {
  const chats = getChats();
  return chats[chatId] || null;
}

// Delete a chat
export function deleteChat(chatId: string): void {
  const chats = getChats();
  delete chats[chatId];
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

// Create a new chat ID
export function createNewChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Clear all chats
export function clearAllChats(): void {
  localStorage.removeItem(CHATS_KEY);
}

// Simple draft storage - just a map of chatId to draft text
export function saveDraft(chatId: string, text: string): void {
  if (typeof window === 'undefined') return;
  
  const drafts = getDrafts();
  
  if (!text.trim()) {
    delete drafts[chatId];
  } else {
    drafts[chatId] = text;
  }
  
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDrafts(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const drafts = localStorage.getItem(DRAFTS_KEY);
  return drafts ? JSON.parse(drafts) : {};
}

export function clearAllDrafts(): void {
  localStorage.removeItem(DRAFTS_KEY);
}

// Add clearDraft function
export function clearDraft(chatId: string): void {
  const drafts = getDrafts();
  delete drafts[chatId];
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

const chatStorageUtils = {
  saveChat,
  getChats,
  getChat,
  deleteChat,
  createNewChatId,
  clearAllChats,
  formatTimeAgo,
  generateTitle,
  saveDraft,
  getDrafts,
  clearAllDrafts,
  clearDraft,
};

export default chatStorageUtils; 