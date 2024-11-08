import React from "react";

interface LoadingMessageProps {
  message: string;
  className?: string;
  color?: string;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({
  message,
  className = "",
  color = "white",
}) => {
  return (
    <div className={`flex items-center gap-3 p-2 ${className}`}>
      <div className="flex gap-1.5">
        <div
          className={`w-1 h-1 bg-${color} rounded-full animate-[fade_2s_linear_infinite]`}
        ></div>
        <div
          className={`w-1 h-1 bg-${color} rounded-full animate-[fade_2s_linear_infinite_0.5s]`}
        ></div>
        <div
          className={`w-1 h-1 bg-${color} rounded-full animate-[fade_2s_linear_infinite_1s]`}
        ></div>
      </div>
      <span className={`text-${color}`}>{message}</span>
    </div>
  );
};

export default LoadingMessage;
