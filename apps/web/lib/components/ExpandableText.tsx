"use client";

import { useState } from "react";

interface ExpandableTextProps {
  text: string | null;
  maxLength?: number;
}

export default function ExpandableText({
  text,
  maxLength = 100,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.length <= maxLength) {
    return <p className="text-gray-600 text-sm max-w-2xl mx-auto">{text}</p>;
  }

  return (
    <div className="relative group">
      <p className="text-gray-600 text-sm max-w-2xl mx-auto transition-all duration-200 ease-in-out">
        <span className={isExpanded ? undefined : "line-clamp-2"}>{text}</span>
      </p>
      <button
        className="text-xs text-teal-600 hover:text-teal-700 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Show {isExpanded ? "less" : "more"}
      </button>
    </div>
  );
}
