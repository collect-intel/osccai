"use client";

import React, { useState } from "react";
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
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onUserMessage,
  isLoading,
  interactive = true,
  icon,
  color = "teal",
  renderMessage,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onUserMessage(inputValue.trim());
    setInputValue("");
  };

  return (
    <div className="flex bg-teal align-items-space-between flex-col h-full border-2 border-light-gray rounded-lg shadow-sm min-h-50 overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "user" ? (
              <div className="flex mr-2">
                <div>
                  {renderMessage(message)}
                </div>
                <FaUserAlt className="w-4 h-4 fill-current text-black self-start ml-2 mt-6" />
              </div>
            ) : (
              <div className="flex ml-2">
                <div className="self-start mt-6 mr-2">
                  {icon || <ConstitutionIcon />}
                </div>
                <div>
                  {renderMessage(message)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {interactive && (
        <form
          onSubmit={handleSubmit}
          className="flex p-4"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Say something"
            className="flex-1 p-6 border border-gray-200 bg-off-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal"
          />
          <button
            type="submit"
            className={`ml-2 px-4 py-2 text-white rounded-md ${
              isLoading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : `bg-${color} hover:bg-black`
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatInterface;
