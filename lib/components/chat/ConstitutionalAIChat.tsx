"use client";

import React, { forwardRef, useCallback, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import AIChat, { AIChatHandle } from "./AIChat";
import { MessageWithFields } from "../../types";
import { ClientProvider, xmllm } from "xmllm/client";
import { FaInfoCircle } from "react-icons/fa";
import AIResponseModal from "./AIResponseModal";

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

Be helpful

=== IMPORTANT ===

Constitution of your values that you will self-reflect on prior to every response:
=== CONSTITUTION ===
${constitutionText}
=== END CONSTITUTION ===

You will reply in <draft_response/>, then <response_metrics/>, <improvement_strategy>, then finally <final_response/> which will internalize and improve upon the analysis.

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
          process.env.PROXY_API_URL || "https://proxyai.cip.org/api/stream";
        const clientProvider = new ClientProvider(proxyUrl);

        // Remove the first two messages
        const messagesToSend = messages.slice(2);
        const convertedMessages = messagesToSend.map((message) => ({
          role: message.role,
          content: message.final_response || message.content,
        }));

        return await xmllm(({ prompt }: { prompt: any }) => {
          return [
            prompt({
              model: [
                'claude:good',
                'openai:good',
                'claude:fast',
                'openai:fast'
              ],
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
              console.log("[ConstitutionalAIChat] Prompt yield t", t);
              // Yield an object with role 'assistant' to create a new message
              yield { role: "assistant", ...t };
            },
          ];
        }, clientProvider);
      },
      [system],
    );

    initialMessages = initialMessages || [
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        content: `Hi there.`,
      },
    ];

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] =
      useState<MessageWithFields | null>(null);

    const MarkdownComponents: Partial<Components> = {
      p: ({ children }) => <p className="mb-2">{children}</p>,
      ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
      li: ({ children }) => <li className="mb-1">{children}</li>,
      h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
      h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
      h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
      blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2">{children}</blockquote>,
    };

    const renderMessage = (message: MessageWithFields) => {
      const isComplete = !message.isStreaming;
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

      if (
        message.role === "assistant" &&
        message.isStreaming &&
        !hasVisibleContent
      ) {
        return (
          <div className={`${messageStyle || ""}`}>Preparing...</div>
        );
      }

      if (!hasVisibleContent) {
        return null;
      }

      return (
        <div
          className={`relative ${messageStyle || ""} ${hasAdditionalInfo ? "pr-8" : ""}`}
        >
          {message.role === "assistant" && isComplete && hasAdditionalInfo && (
            <FaInfoCircle
              className={`absolute top-2 right-2 cursor-pointer ${customStyles.infoIcon || "text-white-500"}`}
              onClick={() => {
                setSelectedMessage(message);
                setModalOpen(true);
              }}
            />
          )}
          <ReactMarkdown
            className="prose max-w-none"
            components={MarkdownComponents}
          >
            {message.final_response || message.content}
          </ReactMarkdown>
        </div>
      );
    };

    return (
      <>
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
          renderLoadingMessage={message => {
            return message.final_response
              ? "Finalizing"
              : message.improvement_strategy
              ? "Improving"
              : message.response_metrics
              ? "Analyzing"
              : message.draft_response
              ? "Drafting"
              : "Thinking";
          }}
        />
        <AIResponseModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          message={selectedMessage}
        />
      </>
    );
  },
);

// Add this line at the end of the file, after the component definition
ConstitutionalAIChat.displayName = "ConstitutionalAIChat";

export default ConstitutionalAIChat;
