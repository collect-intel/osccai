"use client";

import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import { ClientProvider, xmllm } from "xmllm/client";
import ReactMarkdown from "react-markdown";
import { FaRobot, FaUserAlt } from "react-icons/fa";
// Import the necessary types from xmllm
import { XMLLMPromptFn, XMLLMRequestFn } from "../../types";
import ConstitutionIcon from "../icons/ConstitutionIcon";

interface ChatInterfaceProps {
  constitution?: {
    text?: string;
    color?: string;
    icon?: React.ReactNode;
  };
}

interface MessageWithFields {
  role: "user" | "assistant";
  content: string;
  draft_response?: string;
  response_metrics?: string;
  improvement_strategy?: string;
  final_response?: string;
}

const LoadingBubble: React.FC = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        if (prevDots.length === 3) {
          return "";
        } else {
          return prevDots + ".";
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="my-2 p-2 rounded-md bg-gray-200 text-black shadow-md">
      <span>Typing{dots}</span>
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ constitution }) => {
  const [messages, setMessages] = useState<MessageWithFields[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<AsyncGenerator<
    string | { [key: string]: string },
    void,
    unknown
  > | null>(null);

  const initialMessage = constitution
    ? `Hi there. You're chatting with an AI encoded with the constitution of your community model.`
    : "Hi there, how can I help you today?";

  useEffect(() => {
    setMessages([
      {
        role: "user",
        content: "Hi",
      },
      {
        role: "assistant",
        content: initialMessage,
      },
    ]);
  }, [initialMessage]);

  useEffect(() => {
    return () => {
      // Cancel any ongoing stream when component unmounts
      if (streamRef.current) {
        streamRef.current.return();
      }
    };
  }, []);

  const PROXY_URL = "https://proxyai.cip.org/api/stream";

  const clientProvider = new ClientProvider(PROXY_URL);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Cancel any ongoing stream when input changes
    if (streamRef.current) {
      streamRef.current.return();
      streamRef.current = null;
    }

    const isValidRole = (role: string): role is "user" | "assistant" => {
      return role === "user" || role === "assistant";
    };

    let convertedMessages = [
      ...messages,
      { role: "user", content: inputValue.trim() },
    ].map((message) => {
      if (isValidRole(message.role)) {
        return {
          role: message.role,
          content:
            (message as MessageWithFields).final_response || message.content,
        };
      } else {
        return {
          role: "user",
          content: message.content,
        };
      }
    });

    // Convert convertedMessages to type MessageWithFields[]
    convertedMessages = convertedMessages.map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.content,
    }));

    setMessages(convertedMessages as MessageWithFields[]);
    setInputValue("");
    setIsLoading(true);

    if (convertedMessages[messages.length - 1].role === "user") {
      // We need alternating roles as per Claude's requirements
      convertedMessages.push({ role: "assistant", content: "..." });
    }

    console.log("convertedMessages", convertedMessages);

    try {
      let stream;
      if (constitution) {
        stream = await xmllm(
          ({ prompt, req }: { prompt: XMLLMPromptFn; req: XMLLMRequestFn }) => {
            return [
              prompt({
                messages: convertedMessages.map(({ role, content }) => ({
                  role,
                  content,
                })),
                schema: {
                  thinking: String,
                  draft_response: String,
                  response_metrics: String,
                  improvement_strategy: String,
                  final_response: String,
                },
                system: genSystemPrompt(constitution?.text || ""),
              }),
              function* (t: { [key: string]: string }) {
                yield t;
              },
            ];
          },
          clientProvider,
        );
      } else {
        stream = await xmllm(({ req }: { req: XMLLMRequestFn }) => {
          return [
            req({
              system: "Be helpful.",
              messages: convertedMessages.map(({ role, content }) => ({
                role,
                content,
              })),
            }),
            function* (t: { [key: string]: string }) {
              yield t;
            },
          ];
        }, clientProvider);
      }

      streamRef.current = stream;
      setIsLoading(true); // Set loading state to true before processing the stream

      for await (const chunk of stream) {
        if (typeof chunk === "string") {
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage.role === "assistant") {
              return [
                ...prevMessages.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk },
              ];
            } else {
              setIsLoading(false); // Set loading state to false when regular string content is received
              return [...prevMessages, { role: "assistant", content: chunk }];
            }
          });
          continue;
        }

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage.role === "assistant") {
            const updatedMessage: MessageWithFields = { ...lastMessage };

            if (chunk.draft_response) {
              updatedMessage.draft_response = chunk.draft_response;
              setIsLoading(false); // Set loading state to false when draft response is received
            }
            if (chunk.response_metrics) {
              updatedMessage.response_metrics = chunk.response_metrics;
            }
            if (chunk.improvement_strategy) {
              updatedMessage.improvement_strategy = chunk.improvement_strategy;
            }
            if (chunk.final_response) {
              updatedMessage.final_response = chunk.final_response;
            }

            return [...prevMessages.slice(0, -1), updatedMessage];
          } else {
            const newMessage: MessageWithFields = {
              role: "assistant",
              content: "",
            };
            
            if (chunk.draft_response) {
              newMessage.draft_response = chunk.draft_response;
              setIsLoading(false); // Set loading state to false when draft response is received
            }
            if (chunk.response_metrics) {
              newMessage.response_metrics = chunk.response_metrics;
            }
            if (chunk.improvement_strategy) {
              newMessage.improvement_strategy = chunk.improvement_strategy;
            }
            if (chunk.final_response) {
              newMessage.final_response = chunk.final_response;
            }

            return [...prevMessages, newMessage];
          }
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while processing your request.");
      setIsLoading(false); // Set loading state to false in case of an error
    }
  };

  const genSystemPrompt = (
    constitution: string,
    configuredSystemPrompt = "Be helpful",
  ) => {
    if (!constitution.trim()) {
      return "Be a helpful AI assistant";
    }

    return `
Main system prompt:

${configuredSystemPrompt}

=== IMPORTANT ===

Constitution of your values that you will self-reflect on prior to every response:
=== CONSTITUTION ===
${constitution}
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


`;
  };

  return (
    <div
      className={`flex flex-col h-full border-2 border-light-gray rounded-lg shadow-sm overflow-hidden`}
      style={{
        background: `repeating-linear-gradient(
          45deg,
          #ffffff,
          #ffffff 10px,
          #eeeeee 10px,
          #eeeeee 20px
        )`,
      }}
    >
      <div className="flex-1 p-4 overflow-y-auto bg-white bg-opacity-80">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "user" ? (
              <div className="flex mr-2">
                <div
                  className={`my-2 p-2 rounded-md bg-white text-black shadow-md`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <FaUserAlt className="w-4 h-4 fill-current text-black self-start ml-2 mt-6" />
              </div>
            ) : (
              <div className="flex ml-2">
                <div className="self-start mt-6 mr-2">
                  <ConstitutionIcon />
                </div>
                <div
                  className={`my-2 p-2 rounded-md bg-teal text-white shadow-md`}
                >
                  {message.content && (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                  {message.draft_response && (
                    <div className="bg-gray-200 p-2 rounded-md text-white my-2 overflow-hidden relative max-h-30 border border-dotted border-white">
                      <strong>Draft Response:</strong>
                      <pre className="font-mono whitespace-pre-wrap text-xs">
                        <ReactMarkdown>{message.draft_response}</ReactMarkdown>
                      </pre>
                      {message.draft_response.length > 200 && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-200 to-transparent"></div>
                      )}
                    </div>
                  )}
                  {message.response_metrics && (
                    <div className="bg-gray-200 p-2 rounded-md text-white my-2 overflow-hidden relative max-h-30 border border-dotted border-white">
                      <strong>Response Metrics:</strong>
                      <pre className="font-mono whitespace-pre-wrap text-xs">
                        <ReactMarkdown>
                          {message.response_metrics}
                        </ReactMarkdown>
                      </pre>
                      {message.response_metrics.length > 200 && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-200 to-transparent"></div>
                      )}
                    </div>
                  )}
                  {message.improvement_strategy && (
                    <div className="bg-gray-200 p-2 rounded-md text-white my-2 overflow-hidden relative max-h-30 border border-dotted border-white">
                      <strong>Improvement Strategy:</strong>
                      <pre className="font-mono whitespace-pre-wrap text-xs">
                        <ReactMarkdown>
                          {message.improvement_strategy}
                        </ReactMarkdown>
                      </pre>
                      {message.improvement_strategy.length > 200 && (
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-200 to-transparent"></div>
                      )}
                    </div>
                  )}
                  {message.final_response && (
                    <div className="bg-gray-700 p-2 rounded-md">
                      <strong>Final Response:</strong>
                      <ReactMarkdown>{message.final_response}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex ml-2">
              <div className="self-start mt-6 mr-2">
                <ConstitutionIcon />
              </div>
              <LoadingBubble />
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex p-4 bg-white border-t border-light-gray">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`ml-2 px-4 py-2 rounded-md ${
            isLoading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-teal text-white hover:bg-black"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;