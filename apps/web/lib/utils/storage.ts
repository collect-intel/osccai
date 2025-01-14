import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { MessageWithFields } from "../types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const s3Client = new S3Client({
  region: process.env.SUPABASE_REGION!,
  endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/s3`,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function write(
  bucket: string,
  path: string,
  file: Readable,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: path,
    Body: file,
    ContentType: contentType,
    ACL: "public-read", // This makes the object publicly accessible
  });

  await s3Client.send(command);

  // Construct the public URL
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

  return publicUrl;
}

export async function remove(bucket: string, key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

export interface SavedChat {
  id: string;
  messages: MessageWithFields[];
  lastUpdated: number;
  title: string;
}

const CHATS_KEY = "cip-chat-history";

// Helper to generate a title from the first few messages
function generateTitle(messages: MessageWithFields[]): string {
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

// Save a chat to localStorage
export function saveChat(
  chatId: string,
  messages: MessageWithFields[],
  title?: string,
): void {
  if (typeof window === "undefined") return;

  const chats = getChats();
  const existingChat = chats[chatId];

  chats[chatId] = {
    id: chatId,
    messages,
    lastUpdated: Date.now(),
    title: title || existingChat?.title || generateTitle(messages),
  };

  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

// Get all chats from localStorage
export function getChats(): Record<string, SavedChat> {
  if (typeof window === "undefined") return {};
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
