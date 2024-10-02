"use client";

import { useState } from "react";
import { createConstitution } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ConstitutionGenerator({
  modelId,
}: {
  modelId: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleCreateConstitution = async () => {
    setIsGenerating(true);
    try {
      await createConstitution(modelId);
      router.refresh(); // Refresh the page to show the new constitution
    } catch (error) {
      console.error("Failed to create constitution:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-yellow border border-yellow/50 rounded-lg p-6 mb-6">
      <p className="text-gray-800 mb-4">
        Generate a new constitution to define the rules and guidelines for this
        community model. Each new generation will source the data from the very
        latest poll data.
      </p>
      <button
        onClick={handleCreateConstitution}
        disabled={isGenerating}
        className={`bg-teal text-white px-4 py-2 rounded hover:bg-teal-700 transition-colors ${
          isGenerating ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isGenerating ? "Generating..." : "Generate New Constitution"}
      </button>
    </div>
  );
}
