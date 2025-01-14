import { FaExclamationTriangle } from "react-icons/fa";

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
  onRefine,
}: ConstitutionRefinerProps) {
  return (
    <div className="p-4 flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Enter Constitution
      </h2>

      {/* Experimental Warning */}
      <div className="mb-3 flex items-center gap-2 text-amber-800 bg-amber-50 rounded-lg p-3 text-sm">
        <div className="hidden sm:flex items-center justify-center w-5 h-5 rounded-full bg-amber-100">
          <span className="text-xs font-medium">β</span>
        </div>
        <p>
          <span className="font-medium">Experimental Feature:</span> Changes are
          not saved between sessions.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <textarea
          className="h-32 p-3 rounded-lg border border-gray-200 
                   focus:ring-2 focus:ring-teal-500 focus:border-transparent
                   resize-none text-sm"
          placeholder="Enter your constitution here..."
          value={constitution}
          onChange={(e) => onConstitutionChange(e.target.value)}
        />
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg text-sm">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        <button
          className="w-full px-3 py-2 bg-teal-600 text-white rounded-lg 
                   hover:bg-teal-700 disabled:bg-gray-300 
                   disabled:cursor-not-allowed transition-colors
                   text-sm font-medium shadow-sm"
          onClick={onRefine}
          disabled={!constitution.trim() || isRefining}
        >
          {isRefining ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Refining...
            </span>
          ) : (
            "Refine Constitution"
          )}
        </button>
      </div>
    </div>
  );
}
