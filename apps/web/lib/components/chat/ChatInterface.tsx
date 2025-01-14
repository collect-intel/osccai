"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { FaRobot, FaUserAlt } from "react-icons/fa";
import ConstitutionIcon from "../icons/ConstitutionIcon";
import { MessageWithFields } from "../../types";

interface ChatInterfaceProps {
  messages: MessageWithFields[];
  onUserMessage: (message: string) => void;
  isLoading: boolean;
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onUserMessage,
  isLoading,
  interactive = true,
  icon,
  color = "teal",
  renderMessage,
  chatId,
  onInputChange,
  draftInput = "",
  isActiveChat = true,
  initialMessage,
  customStyles,
}) => {
  const [inputValue, setInputValue] = useState(draftInput);

  useEffect(() => {
    setInputValue(draftInput);
  }, [draftInput]);

  useEffect(() => {
    if (messages.length === 0 && initialMessage) {
      renderMessage(initialMessage);
    }
  }, [messages.length, initialMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(chatId, newValue);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onUserMessage(inputValue.trim());
    setInputValue("");
    onInputChange?.(chatId, "");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="relative">
          {messages.map((message, index) => {
            if (!isActiveChat && message.isStreaming) {
              return (
                <div key={index} className="text-gray-500 italic p-3">
                  Message in progress...
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "user" ? (
                  <div className="flex mr-2">
                    <div>{renderMessage(message)}</div>
                    <FaUserAlt className="w-4 h-4 fill-current text-black self-start ml-2 mt-6" />
                  </div>
                ) : (
                  <div className="flex ml-2">
                    <div className="self-start mt-6 mr-2">
                      {icon || <ConstitutionIcon />}
                    </div>
                    <div>{renderMessage(message)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {interactive && isActiveChat && (
        <form
          onSubmit={handleSubmit}
          className="flex p-4 bg-white relative z-10 shadow-[0_-8px_16px_-4px_rgba(255,255,255,0.9)]"
        >
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 p-3 bg-gray-50 rounded-l-md focus:outline-none focus:ring-2 focus:ring-teal focus:bg-white transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-6 py-2 rounded-r-md transition-all ${
              isLoading
                ? "bg-gray-200 text-gray-500"
                : `bg-${color} hover:bg-${color}/80 text-white`
            } disabled:cursor-not-allowed`}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Sending
              </span>
            ) : (
              "Send"
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatInterface;
