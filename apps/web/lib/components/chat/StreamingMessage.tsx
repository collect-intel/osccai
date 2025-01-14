import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface StreamingMessageProps {
  content: string;
  className?: string;
  speed?: "fast" | "normal" | "slow";
  streaming?: boolean;
  variant?: "light" | "dark";
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  className = "",
  speed = "normal",
  streaming = true,
  variant = "light",
}) => {
  const [displayedContent, setDisplayedContent] = useState(
    streaming ? "" : content,
  );

  useEffect(() => {
    if (!streaming) {
      setDisplayedContent(content);
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let currentIndex = displayedContent.length;

    const speedSettings = {
      fast: { interval: 20, charsPerInterval: 4 },
      normal: { interval: 30, charsPerInterval: 3 },
      slow: { interval: 50, charsPerInterval: 1 },
    };

    const { interval, charsPerInterval } = speedSettings[speed];

    const updateContent = () => {
      currentIndex += charsPerInterval;
      if (currentIndex >= content.length) {
        currentIndex = content.length;
        clearInterval(intervalId);
      }
      setDisplayedContent(content.slice(0, currentIndex));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
        setDisplayedContent(content);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!document.hidden) {
      intervalId = setInterval(updateContent, interval);
    } else {
      setDisplayedContent(content);
    }

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [content, speed, streaming]);

  return (
    <div className={`min-h-[1.5em] ${className}`}>
      <ReactMarkdown
        className={`prose ${variant === "dark" ? "prose-invert" : ""} max-w-none`}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          hr: () => <hr className="my-1" />,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-4 last:mb-0 [&>li::marker]:text-inherit">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-4 last:mb-0 [&>li::marker]:text-inherit">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-white/30 pl-4 py-1 mb-4 italic">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-white/10 rounded px-1 py-0.5 text-sm">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-white/10 rounded p-3 mb-4 overflow-x-auto">
              {children}
            </pre>
          ),
        }}
      >
        {displayedContent || "\u00A0"}
      </ReactMarkdown>
    </div>
  );
};

export default StreamingMessage;
