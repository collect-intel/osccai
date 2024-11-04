import React from "react";

interface SavingIndicatorProps {
  status: "idle" | "saving" | "saved";
}

const SavingIndicator: React.FC<SavingIndicatorProps> = ({ status }) => {
  // if (status === 'idle') return null;

  return (
    <div className="flex items-center text-sm">
      {status === "saving" ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-teal-500 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-teal-500">Saving...</span>
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 text-green-500 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-green-500">Saved</span>
        </>
      )}
    </div>
  );
};

export default SavingIndicator;
