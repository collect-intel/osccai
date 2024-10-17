import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { ClientProvider, xmllm } from "xmllm/client";
import { MessageWithFields } from "@/lib/types";
import ChatInterface from "./ChatInterface";

interface AIChatProps {
  onUserMessage?: (message: string) => void;
  onAIMessage?: (message: MessageWithFields, isComplete: boolean) => void;
  system?: string;
  initialMessages?: MessageWithFields[];
  interactive?: boolean;
  icon?: React.ReactNode;
  color?: string;
  renderMessage?: (message: MessageWithFields) => React.ReactNode;
  renderLoadingMessage?: (message: MessageWithFields) => React.ReactNode;
  genStream: (
    messages: MessageWithFields[],
  ) => Promise<
    AsyncGenerator<string | { [key: string]: string }, void, unknown>
  >;
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
      onUserMessage,
      onAIMessage,
      system = "Be helpful.",
      initialMessages = [],
      interactive = true,
      icon,
      color,
      renderMessage,
      genStream,
      renderLoadingMessage,
    },
    ref,
  ) => {
    const [messages, setMessages] =
      useState<MessageWithFields[]>(initialMessages);
    console.log("[AIChat] initialMessages", initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const streamRef = useRef<AsyncGenerator<
      string | { [key: string]: string },
      void,
      unknown
    > | null>(null);
    const currentMessageRef = useRef<MessageWithFields | null>(null);

    const proxyUrl =
      process.env.PROXY_API_URL || "https://proxyai.cip.org/api/stream";

    const clientProvider = new ClientProvider(proxyUrl);

    const addMessage = useCallback(
      (role: "user" | "assistant", content: string) => {
        return new Promise<MessageWithFields[]>((resolve) => {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages, { role, content }];
            resolve(newMessages);
            return newMessages;
          });
        });
      },
      [],
    );

    const handleUserMessage = useCallback(
      async (content: string) => {
        console.log(`[AIChat] handleUserMessage:`, content);
        if (onUserMessage) {
          onUserMessage(content.trim());
        }
        const newMsgs = await addMessage("user", content.trim());
        console.log(`[AIChat] newMsgs:`, newMsgs);
        console.log(`[AIChat] now submitting:`, { messages: newMsgs });
        await submitMessages(newMsgs);
      },
      [onUserMessage, addMessage],
    );

    const submitMessages = useCallback(
      async (messages: MessageWithFields[]) => {
        console.log("[AIChat] submitMessages", messages);
        if (messages.length === 0) return;

        // Cancel any ongoing stream when submitting new messages
        if (streamRef.current) {
          streamRef.current.return();
          streamRef.current = null;
        }

        setIsLoading(true);

        try {
          const stream = await genStream(messages);
          streamRef.current = stream;
          currentMessageRef.current = {
            role: "assistant",
            content: "",
            isStreaming: true,
          };

          setMessages((prevMessages) =>
            currentMessageRef.current
              ? [...prevMessages, currentMessageRef.current]
              : prevMessages,
          );

          for await (const chunk of stream) {
            if (typeof chunk === "string") {
              currentMessageRef.current.content += chunk;
            } else {
              Object.assign(currentMessageRef.current, chunk);
            }

            if (onAIMessage) {
              onAIMessage(currentMessageRef.current, false);
            }

            // Force update to re-render with new content
            forceUpdate();
          }

          console.log(
            "[AIChat] final currentMessage",
            currentMessageRef.current,
          );

          if (currentMessageRef.current) {
            currentMessageRef.current.isStreaming = false;
            if (onAIMessage) {
              onAIMessage(currentMessageRef.current, true);
            }

            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg === currentMessageRef.current
                  ? { ...currentMessageRef.current }
                  : msg,
              ),
            );
          }
        } catch (error) {
          console.error("Error:", error);
        } finally {
          setIsLoading(false);
          currentMessageRef.current = null;
        }
      },
      [genStream, onAIMessage],
    );

    // Force update without changing state
    const [, updateState] = useState({});
    const forceUpdate = useCallback(() => updateState({}), []);

    useImperativeHandle(
      ref,
      () => ({
        addMessage: async (
          role: "user" | "assistant",
          content: string,
          submit = false,
        ) => {
          console.log("[AIChat] addMessage", role, content, submit);
          const updatedMessages = await addMessage(role, content);
          if (submit) {
            console.log("[AIChat] addMessage submit", updatedMessages);
            await submitMessages(updatedMessages);
          }
          return updatedMessages;
        },
        getMessages: async () => {
          return messages;
        },
        submitMessages, // Expose the new method
      }),
      [addMessage, submitMessages, messages],
    );

    const renderMessages = useCallback(() => {
      return messages.map((message) => ({
        ...message,
        isComplete: !message.isStreaming && message.role === "assistant",
      }));
    }, [messages]);

    return (
      <div className="h-full flex flex-col">
        {renderMessages().length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            No messages to show
          </div>
        ) : (
          <ChatInterface
            messages={renderMessages()}
            onUserMessage={handleUserMessage}
            isLoading={isLoading}
            interactive={interactive}
            icon={icon}
            color={color}
            renderMessage={renderMessage}
            renderLoadingMessage={renderLoadingMessage}
          />
        )}
      </div>
    );
  },
);

AIChat.displayName = "AIChat";

export default AIChat;
