import { MessageWithFields } from "../types";

export interface SavedChat {
  id: string;
  messages: MessageWithFields[];
  lastUpdated: number;
  title: string;
  isPseudoEntry?: boolean;
}

// Modify the storage key to include model ID
const getChatsKey = (modelId: string) => `cip-chat-history-${modelId}`;
const getDraftsKey = (modelId: string) => `cip-chat-drafts-${modelId}`;

interface ChatDraft {
  inputValue: string;
  lastUpdated: number;
}

export const NEW_CHAT_ID = "new-chat";

export function generateTitle(
  messages: MessageWithFields[] | undefined,
): string {
  if (!messages || messages.length === 0) {
    return `Chat ${new Date().toLocaleDateString()}`;
  }

  const firstUserMessage = messages.find((m) => m.role === "user")?.content;
  if (firstUserMessage) {
    return (
      firstUserMessage.slice(0, 40) +
      (firstUserMessage.length > 40 ? "..." : "")
    );
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
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit.charAt(0)}`; // e.g., "3h", "2d", "1w"
    }
  }

  return "now";
}

export function saveChat(
  modelId: string,
  chatId: string,
  messages: MessageWithFields[] | undefined,
  title?: string,
): void {
  if (typeof window === "undefined") return;

  const chats = getChats(modelId);
  const existingChat = chats[chatId];

  chats[chatId] = {
    id: chatId,
    messages: messages || [],
    lastUpdated: Date.now(),
    title: title || existingChat?.title || generateTitle(messages),
  };

  localStorage.setItem(getChatsKey(modelId), JSON.stringify(chats));
}

export function getChats(modelId: string): Record<string, SavedChat> {
  if (typeof window === "undefined") return {};
  const chats = localStorage.getItem(getChatsKey(modelId));
  return chats ? JSON.parse(chats) : {};
}

export function getChat(modelId: string, chatId: string): SavedChat | null {
  const chats = getChats(modelId);
  return chats[chatId] || null;
}

export function deleteChat(modelId: string, chatId: string): void {
  const chats = getChats(modelId);
  delete chats[chatId];
  localStorage.setItem(getChatsKey(modelId), JSON.stringify(chats));
}

export function createNewChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function clearAllChats(modelId: string): void {
  localStorage.removeItem(getChatsKey(modelId));
}

export function saveDraft(modelId: string, chatId: string, text: string): void {
  if (typeof window === "undefined") return;

  const drafts = getDrafts(modelId);

  if (!text.trim()) {
    delete drafts[chatId];
  } else {
    drafts[chatId] = text;
  }

  localStorage.setItem(getDraftsKey(modelId), JSON.stringify(drafts));
}

export function getDrafts(modelId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const drafts = localStorage.getItem(getDraftsKey(modelId));
  return drafts ? JSON.parse(drafts) : {};
}

export function clearAllDrafts(modelId: string): void {
  localStorage.removeItem(getDraftsKey(modelId));
}

export function clearDraft(modelId: string, chatId: string): void {
  const drafts = getDrafts(modelId);
  delete drafts[chatId];
  localStorage.setItem(getDraftsKey(modelId), JSON.stringify(drafts));
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
