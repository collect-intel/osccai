import { FaExclamationTriangle } from 'react-icons/fa';

interface ConstitutionRefinerProps {
  constitution: string;
  onConstitutionChange: (value: string) => void;
  isRefining: boolean;
  error: string | null;
  onRefine: () => void;
}

export default function ConstitutionRefiner({
  constitution,
  onConstitutionChange,
  isRefining,
  error,
  onRefine
}: ConstitutionRefinerProps) {
  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Enter Constitution</h2>
      <div className="flex-1 flex flex-col gap-4">
        <textarea
          className="flex-1 p-4 rounded-lg border border-gray-200 
                   focus:ring-2 focus:ring-teal-500 focus:border-transparent
                   resize-none shadow-sm"
          placeholder="Enter your constitution here..."
          value={constitution}
          onChange={(e) => onConstitutionChange(e.target.value)}
        />
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        <button
          className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg 
                   hover:bg-teal-700 disabled:bg-gray-300 
                   disabled:cursor-not-allowed transition-colors
                   shadow-sm"
          onClick={onRefine}
          disabled={!constitution.trim() || isRefining}
        >
          {isRefining ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Refining...
            </span>
          ) : (
            'Refine Constitution'
          )}
        </button>
      </div>
    </div>
  );
} 