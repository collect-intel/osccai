import LoadingMessage from '../chat/LoadingMessage';
import ReactMarkdown from 'react-markdown';

interface RefinedDisplayProps {
  isRefining: boolean;
  refinedConstitution: string;
  reasoning: string;
  metrics?: { metric: string[] };
}

export default function RefinedDisplay({
  isRefining,
  refinedConstitution,
  reasoning,
  metrics
}: RefinedDisplayProps) {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Refined Constitution</h2>
      <div className="space-y-6">
        {/* Reasoning Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-800 mb-2">AI Reasoning</h3>
          {isRefining && !reasoning ? (
            <LoadingMessage
              message="Analyzing constitution..."
              className="bg-blue-50 rounded-lg p-4 border border-blue-100"
              color="blue-600"
            />
          ) : reasoning ? (
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100">
              {reasoning}
            </div>
          ) : (
            <div className="bg-blue-50/50 text-blue-800/50 p-4 rounded-lg border border-blue-100">
              Waiting for AI reasoning...
            </div>
          )}
        </div>

        {/* Metrics Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-800 mb-2">Constitution Metrics</h3>
          {isRefining && !metrics ? (
            <LoadingMessage
              message="Calculating metrics..."
              className="bg-purple-50 rounded-lg p-4 border border-purple-100"
              color="purple-600"
            />
          ) : metrics && metrics.metric.length > 0 ? (
            <div className="bg-purple-50 text-purple-800 p-4 rounded-lg border border-purple-100">
              <ul className="list-disc pl-4 space-y-1">
                {metrics.metric.map((metric, index) => (
                  <li key={index}>{metric}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-purple-50/50 text-purple-800/50 p-4 rounded-lg border border-purple-100">
              Waiting for constitution metrics...
            </div>
          )}
        </div>

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