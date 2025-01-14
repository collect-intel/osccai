import { useState } from "react";
import LoadingMessage from "../chat/LoadingMessage";
import ReactMarkdown from "react-markdown";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface RefinedDisplayProps {
  isRefining: boolean;
  refinedConstitution: string;
  reflection: string;
  metrics?: { metric: string[] };
}

export default function RefinedDisplay({
  isRefining,
  refinedConstitution,
  reflection,
  metrics,
}: RefinedDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Toggle Button - Always visible */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-2 flex items-center justify-between text-gray-600 hover:bg-gray-50"
        >
          <span className="text-sm font-medium">
            {showDetails ? "Show Constitution" : "Show AI Analysis"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {showDetails
                ? "View Constitution"
                : "View AI Reasoning & Metrics"}
            </span>
            {showDetails ? <FaChevronDown /> : <FaChevronUp />}
          </div>
        </button>
      </div>

      {/* Content Area - Switches between Constitution and Analysis */}
      <div className="flex-1 overflow-y-auto">
        {showDetails ? (
          <div className="p-6 space-y-6">
            {/* AI Reasoning */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                AI Reasoning
              </h3>
              <div className="prose text-sm text-gray-600 bg-white rounded-lg p-4 shadow-sm">
                {reflection}
              </div>
            </div>

            {/* Metrics */}
            {metrics?.metric?.length && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Key Metrics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {metrics.metric.map((metric, index) => (
                    <span key={index} className="...">
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <article className="prose prose-lg max-w-none">
              <ReactMarkdown>{refinedConstitution}</ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
