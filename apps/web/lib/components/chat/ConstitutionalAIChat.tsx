"use client";

import React, { forwardRef, useCallback, useState, useEffect, useRef } from "react";
import AIChat, { AIChatHandle } from "./AIChat";
import { MessageWithFields } from "../../types";
import { ClientProvider, xmllm } from "xmllm/client";
import { FaInfoCircle } from "react-icons/fa";
import AIResponseModal from "./AIResponseModal";
import LoadingMessage from "./LoadingMessage";
import StreamingMessage from "./StreamingMessage";
import { getChat, saveChat } from '@/lib/utils/chatStorage';

declare const process: {
  env: {
    NEXT_PUBLIC_PROXY_API_URL?: string;
  };
};

interface ChatState {
  messages: MessageWithFields[];
  isStreaming: boolean;
}

interface ConstitutionalAIChatProps {
  chatId: string;
  modelId: string;
  model?: string | string[];
  constitution: {
    text: string;
    icon?: React.ReactNode;
    color?: string;
  };
  customStyles?: {
    userMessage?: string;
    aiMessage?: string;
    infoIcon?: string;
  };
  onInputChange?: (chatId: string, value: string) => void;
  draftInput?: string;
  initialMessage?: MessageWithFields;
  ephemeral?: boolean;
}

const ConstitutionalAIChat = forwardRef<AIChatHandle, ConstitutionalAIChatProps>(
  ({
    chatId,
    modelId,
    model,
    constitution,
    customStyles = {},
    onInputChange,
    draftInput,
    initialMessage,
    ephemeral = false,
  }, ref) => {
    const [chats, setChats] = useState<Record<string, ChatState>>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<MessageWithFields | null>(null);

    // Initialize messages
    useEffect(() => {
      if (chats[chatId]) return;

      const defaultMessage = initialMessage || {
        role: "assistant",
        content: "Hi there! I'm an AI assistant. How can I help you today?",
        isInitialMessage: true,
      };

      const messages = ephemeral ? 
        [defaultMessage] : 
        getChat(modelId, chatId)?.messages || [defaultMessage];

      setChats(current => ({
        ...current,
        [chatId]: {
          messages,
          isStreaming: false
        }
      }));
    }, [chatId, initialMessage, modelId, ephemeral]);

    const genStream = async (messages: MessageWithFields[]) => {
      const proxyUrl = process.env.NEXT_PUBLIC_PROXY_API_URL || "https://proxyai.cip.org/api/stream";
      const clientProvider = new ClientProvider(proxyUrl);

      const convertedMessages = messages.map((message) => ({
        role: message.role,
        content: message.final_response || message.content,
      }));

      return await xmllm(({ prompt }: { prompt: any }) => {
        return [
          prompt({
            model: model || ["claude:good", "openai:good", "claude:fast", "openai:fast"],
            messages: convertedMessages,
            schema: {
              thinking: String,
              draft_response: String,
              response_metrics: String,
              improvement_strategy: String,
              final_response: String,
            },
            system: system,
          }),
          function* (t: any) {
            yield { role: "assistant", ...t };
          },
        ];
      }, clientProvider);
    };

    const handleUserMessage = useCallback(async (content: string) => {
      setChats(current => {
        const chatState = current[chatId];
        const updatedMessages = [...(chatState?.messages || []), 
          { 
            role: "user" as const, 
            content,
            isNewMessage: true 
          },
          { 
            role: "assistant" as const, 
            content: "",
            isStreaming: true,
            isNewMessage: true 
          }
        ];
        
        return {
          ...current,
          [chatId]: {
            messages: updatedMessages,
            isStreaming: true
          }
        };
      });

      const currentChat = chats[chatId];
      const messagesForStream = [
        ...(currentChat?.messages || []),
        { role: "user" as const, content }
      ];

      try {
        const stream = await genStream(messagesForStream);
        
        for await (const chunk of stream) {
          setChats(current => {
            const chatState = current[chatId];
            const newMessages = [...(chatState?.messages || [])];
            const streamingIndex = newMessages.length - 1;

            if (typeof chunk === "string") {
              newMessages[streamingIndex] = {
                ...newMessages[streamingIndex],
                content: (newMessages[streamingIndex].content || "") + chunk
              };
            } else {
              newMessages[streamingIndex] = {
                ...newMessages[streamingIndex],
                ...chunk
              };
            }

            saveMessages(newMessages);
            return {
              ...current,
              [chatId]: {
                messages: newMessages,
                isStreaming: true
              }
            };
          });
        }

        setChats(current => {
          const chatState = current[chatId];
          const newMessages = [...(chatState?.messages || [])];
          const streamingIndex = newMessages.length - 1;
          newMessages[streamingIndex] = {
            ...newMessages[streamingIndex],
            isStreaming: false
          };
          saveMessages(newMessages);
          return {
            ...current,
            [chatId]: {
              messages: newMessages,
              isStreaming: false
            }
          };
        });

      } catch (error) {
        console.error("Error in AI response:", error);
      }
    }, [chatId, chats, modelId]);

    const activeChat = chats[chatId] || { messages: [], isStreaming: false };

    const genSystemPrompt = (constitutionText: string): string => {
      if (!constitutionText.trim()) {
        return "Be a helpful AI assistant";
      }

      return `
Main system prompt:

=== IMPORTANT ===
Here is a constitution of your values that you will self-reflect on prior to every response:
=== CONSTITUTION ===
${constitutionText}
=== END CONSTITUTION ===

You will reply in <draft_response/>, then <response_metrics/>, <improvement_strategy>, then finally <final_response/> which will internalize and improve upon the analysis.

You will embody the values of the constitution in your final response. You will ensure that you don't overly insert the community into the response; answer the user's question directly.

In <response_metrics/> you will analyze your draft response's suitability given the Constitution. Pluck out a reasonable diversity of meaningful metrics from the constitution itself (at your own discretion), and then analyze the response giving percentage scores. For example, if the Constitution says: 

"""
The AI will be diligent.
The AI will be terse.
The AI will be curious.
The AI will not be patronizing.
"""

Then you would output the following:

<draft_response>It's raining</draft_response>
<response_metrics>
Diligent: 10% (bad)
Terse: 50% (ok)
Curious: 10% (bad)
Patronizing: 10% (good)
</response_metrics>
<improvement_strategy>...</improvement_strategy>
<final_response>
I observe a peculiar atmospheric phenomenon...
</final_response>
`.trim();
    };

    const system = genSystemPrompt(constitution.text);

    const renderMessage = (message: MessageWithFields) => {
      const hasVisibleContent =
        (message.final_response && message.final_response.trim() !== "") ||
        (message.content && message.content.trim() !== "");
      const hasAdditionalInfo = !!(
        message.draft_response ||
        message.response_metrics ||
        message.improvement_strategy
      );

      const messageStyle =
        message.role === "user"
          ? customStyles.userMessage || "bg-white text-black rounded-lg p-4"
          : customStyles.aiMessage || "bg-teal text-white rounded-lg p-4";

      if (message.role === "user") {
        return (
          <div className={`relative ${messageStyle}`}>
            <StreamingMessage
              content={message.content}
              speed="normal"
              streaming={false}
              className="prose max-w-none"
              variant="light"
            />
          </div>
        );
      }

      if (message.isStreaming && !hasVisibleContent) {
        if (!chatId) return null;
        
        if (activeChat.isStreaming) {
          if (message.draft_response && !message.response_metrics) {
            return (
              <LoadingMessage
                message="Reflecting"
                className={messageStyle}
                color="white"
              />
            );
          } else if (message.response_metrics && !message.final_response) {
            return (
              <LoadingMessage
                message="Improving"
                className={messageStyle}
                color="white"
              />
            );
          }
          return (
            <LoadingMessage
              message="Thinking"
              className={messageStyle}
              color="white"
            />
          );
        }
        return null;
      }

      if (!hasVisibleContent) {
        return null;
      }

      return (
        <div className={`relative ${messageStyle} ${hasAdditionalInfo ? "pr-8" : ""}`}>
          {hasAdditionalInfo && (
            <FaInfoCircle
              className={`absolute top-2 right-2 cursor-pointer ${customStyles.infoIcon || "text-blue-500"}`}
              onClick={() => {
                setSelectedMessage(message);
                setModalOpen(true);
              }}
            />
          )}
          <StreamingMessage
            content={message.final_response || message.content}
            speed="normal"
            streaming={
              activeChat.isStreaming && message.isStreaming && message.role === "assistant" && !message.isInitialMessage
            }
            className="prose max-w-none"
            variant="dark"
          />
        </div>
      );
    };

    // Only save if not ephemeral
    const saveMessages = useCallback((messages: MessageWithFields[]) => {
      if (!ephemeral) {
        saveChat(modelId, chatId, messages);
      }
    }, [modelId, chatId, ephemeral]);

    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 overflow-y-auto">
          <AIChat
            ref={ref}
            messages={activeChat.messages}
            onUserMessage={handleUserMessage}
            interactive={true}
            icon={constitution.icon}
            color={constitution.color}
            renderMessage={renderMessage}
            chatId={chatId}
            onInputChange={onInputChange}
            draftInput={draftInput}
            initialMessage={initialMessage}
          />
        </div>
        <AIResponseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          message={selectedMessage}
        />
      </div>
    );
  }
);

ConstitutionalAIChat.displayName = "ConstitutionalAIChat";

export default ConstitutionalAIChat;
