"use client";

import ConstitutionalAIChat from "@/lib/components/chat/ConstitutionalAIChat";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import { createNewChatId } from "@/lib/utils/chatStorage";
import { useState } from "react";

export default function SimpleChatClient({ model }: { model: any }) {
  const [chatId] = useState(() => createNewChatId());
  const latestConstitution = model.constitutions[0];

  const initialMessage = {
    role: "assistant" as const,
    content: `Hi there! I'm an AI assistant guided by ${model.name}. How can I help you today?`,
    isInitialMessage: true
  };

  const PreviewBanner = () => {
    if (!model.published) {
      return (
        <div className="fixed top-4 right-4 bg-yellow/20 text-black px-4 py-2 rounded-lg text-sm shadow-sm">
          <span className="font-medium">Preview Mode</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[100dvh] bg-soft-gray">
      <PreviewBanner />
      <ConstitutionalAIChat
        chatId={chatId}
        initialMessage={initialMessage}
        constitution={{
          text: latestConstitution.content,
          icon: <ConstitutionIcon />,
          color: 'teal',
        }}
        customStyles={{
          userMessage: 'bg-white rounded-lg p-3 mb-4 shadow-sm',
          aiMessage: 'bg-teal rounded-lg p-3 mb-4 shadow-sm text-white',
          infoIcon: 'text-teal-600 hover:text-teal-700 transition-colors',
        }}
      />
    </div>
  );
} 