"use client";

import { useState } from "react";
import { triggerGacUpdate } from "@/lib/actions/admin";

interface UpdateGacButtonProps {
  pollId: string;
}

// Add this interface to define the response type
interface GacUpdateResponse {
  success: boolean;
  error?: string;
}

export default function UpdateGacButton({ pollId }: UpdateGacButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GacUpdateResponse | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await triggerGacUpdate(pollId);
      setResult(response as GacUpdateResponse);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }

    // Clear result message after 5 seconds
    setTimeout(() => {
      setResult(null);
    }, 5000);
  };

  return (
    <div className="inline-flex items-center">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`px-3 py-1 text-xs rounded ${
          isLoading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        title="Recalculate consensus scores for this poll"
      >
        {isLoading ? "Updating..." : "Update GAC"}
      </button>

      {result && (
        <span
          className={`ml-2 text-xs ${
            result.success ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.success ? "✓ Updated" : `✗ ${result.error || "Failed"}`}
        </span>
      )}
    </div>
  );
}
