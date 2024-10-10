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
  renderMessage?: (message: MessageWithFields) => React.ReactNode;
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
      <span>Thinking{dots}</span>
    </div>
  );
};

const defaultMessageRender = (message: MessageWithFields) => (
  <ReactMarkdown>{message.content}</ReactMarkdown>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onUserMessage,
  isLoading,
  interactive = true,
  icon,
  color = "teal",
  renderMessage = defaultMessageRender,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onUserMessage(inputValue.trim());
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full border-2 border-light-gray rounded-lg shadow-sm overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto bg-white bg-opacity-80">
        {messages.map((message, index) => {
          const renderedMessage = renderMessage(message);
          const hasVisibleContent =
            message.role === "user" ||
            (message.content && message.content.trim() !== "") ||
            (message.final_response && message.final_response.trim() !== "");

          return (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "user" ? (
                <div className="flex mr-2">
                  <div className="my-2 p-2 rounded-md bg-white text-black shadow-md">
                    {renderedMessage}
                  </div>
                  <FaUserAlt className="w-4 h-4 fill-current text-black self-start ml-2 mt-6" />
                </div>
              ) : (
                <div className="flex ml-2">
                  <div className="self-start mt-6 mr-2">
                    {icon || <ConstitutionIcon />}
                  </div>
                  {message.isStreaming && !hasVisibleContent ? (
                    <LoadingBubble />
                  ) : hasVisibleContent ? (
                    <div
                      className={`my-2 p-2 rounded-md bg-${color} text-white shadow-md`}
                    >
                      {renderedMessage}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {interactive && (
        <form
          onSubmit={handleSubmit}
          className="flex p-4 bg-white border-t border-light-gray"
        >
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
                : `bg-${color} text-white hover:bg-black`
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
