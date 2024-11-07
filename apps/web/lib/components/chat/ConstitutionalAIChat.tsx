"use client";

import React, { forwardRef, useCallback, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import AIChat, { AIChatHandle } from "./AIChat";
import { MessageWithFields } from "../../types";
import { ClientProvider, xmllm } from "xmllm/client";
import { FaInfoCircle } from "react-icons/fa";
import AIResponseModal from "./AIResponseModal";
import LoadingMessage from "./LoadingMessage";
import StreamingMessage from "./StreamingMessage";

interface ConstitutionalAIChatProps {
  onUserMessage?: (message: string) => void;
  onAIMessage?: (message: MessageWithFields, isComplete: boolean) => void;
  constitution: {
    text: string;
    icon?: React.ReactNode;
    color?: string;
  };
  initialMessages?: MessageWithFields[];
  interactive?: boolean;
  customStyles?: {
    userMessage?: string;
    aiMessage?: string;
    infoIcon?: string;
  };
}

const ConstitutionalAIChat = forwardRef<
  AIChatHandle,
  ConstitutionalAIChatProps
>(
  (
    {
      onUserMessage,
      onAIMessage,
      constitution,
      interactive = true,
      initialMessages,
      customStyles = {},
    },
    ref,
  ) => {
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

    const genStream = useCallback(
      async (messages: MessageWithFields[]) => {
        const proxyUrl =
          process.env.NEXT_PUBLIC_PROXY_API_URL || "https://proxyai.cip.org/api/stream";
        const clientProvider = new ClientProvider(proxyUrl);

        const convertedMessages = messages.map((message) => ({
          role: message.role,
          content: message.final_response || message.content,
        }));
        
        return await xmllm(({ prompt }: { prompt: any }) => {
          return [
            prompt({
              model: "claude:good",
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
      },
      [system],
    );

    initialMessages = initialMessages?.map(msg => ({ ...msg, isInitialMessage: true })) || [
      { role: "user", content: "Hello", isInitialMessage: true },
      { role: "assistant", content: `Hi there.`, isInitialMessage: true },
    ];

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] =
      useState<MessageWithFields | null>(null);

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
          ? customStyles.userMessage
          : customStyles.aiMessage;

      // For user messages, use ReactMarkdown with consistent styling
      if (message.role === "user") {
        return (
          <div className={`relative ${messageStyle || ""}`}>
            <ReactMarkdown
              className="prose max-w-none"
              components={{
                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-4 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-200 pl-4 py-1 mb-4 italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 rounded px-1 py-0.5 text-sm">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 rounded p-3 mb-4 overflow-x-auto">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        );
      }

      // Handle AI messages with loading states
      if (message.isStreaming && !hasVisibleContent) {
        if (message.draft_response && !message.response_metrics) {
          return <LoadingMessage 
            message="Reflecting" 
            className={messageStyle || ""} 
            color="white" 
          />;
        } else if (message.response_metrics && !message.final_response) {
          return <LoadingMessage 
            message="Improving" 
            className={messageStyle || ""} 
            color="white" 
          />;
        }
        return <LoadingMessage 
          message="Thinking" 
          className={messageStyle || ""} 
          color="white" 
        />;
      }

      if (!hasVisibleContent) {
        return null;
      }

      // Only AI messages get the streaming effect
      return (
        <div className={`relative ${messageStyle || ""} ${hasAdditionalInfo ? "pr-8" : ""}`}>
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
            streaming={message.role === "assistant" && !message.isInitialMessage}
            className="prose max-w-none"
          />
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <AIChat
            ref={ref}
            onUserMessage={onUserMessage}
            onAIMessage={onAIMessage}
            system={system}
            initialMessages={initialMessages}
            interactive={interactive}
            icon={constitution.icon}
            color={constitution.color}
            renderMessage={renderMessage}
            genStream={genStream}
          />
        </div>
        <AIResponseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          message={selectedMessage}
        />
      </div>
    );
  },
);

// Add this line at the end of the file, after the component definition
ConstitutionalAIChat.displayName = "ConstitutionalAIChat";

export default ConstitutionalAIChat;
