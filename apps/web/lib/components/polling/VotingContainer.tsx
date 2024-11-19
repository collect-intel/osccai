"use client";

import { useState } from "react";
import Voting from "@/lib/components/polling/Voting";
import { Statement } from "@prisma/client";
import ListIcon from "@/lib/components/icons/ListIcon";
import type { VoteValue } from "@prisma/client";

interface VotingContainerProps {
  statements: Statement[];
  pollId: string;
  requireAuth: boolean;
  initialVotes: Record<string, VoteValue>;
  allowParticipantStatements: boolean;
}

export default function VotingContainer({
  statements,
  pollId,
  requireAuth,
  initialVotes,
  allowParticipantStatements,
}: VotingContainerProps) {
  const [viewMode, setViewMode] = useState<"list" | "individual">("individual");

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "individual" : "list");
  };

  return (
    <div className="rounded-md">
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold">Vote on these statements</div>
        <button
          onClick={toggleViewMode}
          className="text-gray hover:text-medium-gray text-sm flex items-center gap-2"
        >
          {viewMode === "list" ? (
            "Switch to individual view"
          ) : (
            <>
              <ListIcon className="w-4 h-4 stroke-current" />
              View all statements
            </>
          )}
        </button>
      </div>
      <Voting
        statements={statements}
        pollId={pollId}
        requireAuth={requireAuth}
        initialVotes={initialVotes}
        viewMode={viewMode}
        allowParticipantStatements={allowParticipantStatements}
      />
    </div>
  );
}
