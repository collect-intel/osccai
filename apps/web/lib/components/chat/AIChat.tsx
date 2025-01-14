import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useEffect,
} from "react";
import { ClientProvider, xmllm } from "xmllm/client";
import { MessageWithFields } from "@/lib/types";
import ChatInterface from "./ChatInterface";

interface AIChatProps {
  messages: MessageWithFields[];
  onUserMessage: (message: string) => Promise<void>;
  interactive?: boolean;
  icon?: React.ReactNode;
  color?: string;
  renderMessage: (message: MessageWithFields) => React.ReactNode;
  chatId: string;
  onInputChange?: (chatId: string, value: string) => void;
  draftInput?: string;
  isActiveChat?: boolean;
  initialMessage?: MessageWithFields;
  customStyles?: {
    userMessage?: string;
    aiMessage?: string;
    infoIcon?: string;
  };
}

export interface AIChatHandle {
  addMessage: (
    role: "user" | "assistant",
    content: string,
    submit?: boolean,
  ) => Promise<MessageWithFields[]>;
  getMessages: () => Promise<MessageWithFields[]>;
  submitMessages: (messages: MessageWithFields[]) => Promise<void>;
}

const AIChat = forwardRef<AIChatHandle, AIChatProps>(
  (
    {
      messages,
      onUserMessage,
      interactive = true,
      icon,
      color,
      renderMessage,
      chatId,
      onInputChange,
      draftInput,
      isActiveChat = true,
      initialMessage,
      customStyles,
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleUserMessage = useCallback(
      async (content: string) => {
        setIsLoading(true);
        try {
          await onUserMessage(content.trim());
        } finally {
          setIsLoading(false);
        }
      },
      [onUserMessage],
    );

    return (
      <div className="h-full flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            No messages to show
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            onUserMessage={handleUserMessage}
            isLoading={isLoading}
            interactive={interactive}
            icon={icon}
            color={color}
            renderMessage={renderMessage}
            chatId={chatId}
            onInputChange={onInputChange}
            draftInput={draftInput}
            isActiveChat={isActiveChat}
            initialMessage={initialMessage}
            customStyles={customStyles}
          />
        )}
      </div>
    );
  },
);

AIChat.displayName = "AIChat";

export default AIChat;
