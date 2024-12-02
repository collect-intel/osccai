import { useState } from 'react';
import LoadingMessage from '../chat/LoadingMessage';
import ReactMarkdown from 'react-markdown';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface RefinedDisplayProps {
  isRefining: boolean;
  refinedConstitution: string;
  reflection: string;
  metrics?: { metric: string[] };
}

interface ExpandableBoxProps {
  title: string;
  content: React.ReactNode;
  isLoading: boolean;
  loadingMessage: string;
  color: string;
}

const ExpandableBox = ({ title, content, isLoading, loadingMessage, color }: ExpandableBoxProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`mb-6 bg-${color}-50 rounded-lg border border-${color}-100 overflow-hidden`}>
      <h3 className="text-md font-semibold text-gray-800 mb-2 px-4 pt-4">{title}</h3>
      {isLoading ? (
        <LoadingMessage
          message={loadingMessage}
          className="p-4"
          color={`${color}-600`}
        />
      ) : content ? (
        <div className="relative">
          <div className={`px-4 pb-12 ${!isExpanded ? 'max-h-32' : ''} overflow-hidden`}>
            {content}
          </div>
          {!isExpanded && (
            <div className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-${color}-50 to-transparent`} />
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`absolute bottom-2 right-2 px-3 py-1.5 
                       bg-white shadow-sm border border-${color}-100
                       text-${color}-600 hover:text-${color}-700 
                       rounded-full
                       flex items-center gap-1.5 text-sm font-medium 
                       transition-colors hover:bg-${color}-50`}
          >
            {isExpanded ? (
              <>Show Less <FaChevronUp className="w-2.5 h-2.5" /></>
            ) : (
              <>Show More <FaChevronDown className="w-2.5 h-2.5" /></>
            )}
          </button>
        </div>
      ) : (
        <div className={`text-${color}-800/50 p-4`}>
          Waiting for content...
        </div>
      )}
    </div>
  );
};

export default function RefinedDisplay({
  isRefining,
  refinedConstitution,
  reflection,
  metrics
}: RefinedDisplayProps) {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Refined Constitution</h2>
      <div className="space-y-6">
        {/* Reflection Section */}
        <ExpandableBox
          title="AI Reasoning"
          content={
            <div className="text-blue-800">
              {reflection}
            </div>
          }
          isLoading={isRefining && !reflection}
          loadingMessage="Analyzing constitution..."
          color="blue"
        />

        {/* Metrics Section */}
        <ExpandableBox
          title="Constitution Metrics"
          content={
            metrics && metrics.metric.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-purple-800">
                {metrics.metric.map((metric, index) => (
                  <li key={index}>{metric}</li>
                ))}
              </ul>
            ) : null
          }
          isLoading={isRefining && !metrics}
          loadingMessage="Calculating metrics..."
          color="purple"
        />

        {/* Constitution Section */}
        <div>
          {isRefining && !refinedConstitution ? (
            <LoadingMessage
              message="Refining constitution..."
              className="bg-white rounded-lg p-4 border"
              color="gray-600"
            />
          ) : refinedConstitution ? (
            <article className="font-serif prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="font-serif text-3xl mb-6 text-gray-900" {...props} />,
                  h2: ({node, ...props}) => <h2 className="font-serif text-2xl mb-4 text-gray-900" {...props} />,
                  h3: ({node, ...props}) => <h3 className="font-serif text-xl mb-3 text-gray-900" {...props} />,
                  p: ({node, ...props}) => <p className="font-serif text-gray-800 leading-relaxed mb-4" {...props} />,
                  ul: ({node, ...props}) => <ul className="font-serif list-disc pl-4 mb-4" {...props} />,
                  li: ({node, ...props}) => <li className="font-serif text-gray-800 mb-2" {...props} />,
                  code: ({node, ...props}) => <span className="font-serif text-gray-800" {...props} />,
                  pre: ({children}) => <div className="font-serif text-gray-800 mb-4">{children}</div>,
                }}
              >
                {refinedConstitution}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="text-gray-400 p-4 rounded-lg border border-dashed">
              Waiting for refined constitution...
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 