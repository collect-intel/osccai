"use client";

import { useState } from "react";
import Voting from "@/lib/components/polling/Voting";
import { Statement } from "@prisma/client";
import Button from "@/lib/components/Button";
import ListIcon from "@/lib/components/icons/ListIcon";

interface VotingContainerProps {
  statements: Statement[];
  pollId: string;
  requireAuth: boolean;
  initialVotes: Record<string, VoteValue>;
  isAuthenticated: boolean;
}

export default function VotingContainer({
  statements,
  pollId,
  requireAuth,
  initialVotes,
  isAuthenticated
}: VotingContainerProps) {
  const [viewMode, setViewMode] = useState<"list" | "individual">("list");

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "individual" : "list");
  };

  const handleVote = async (statementId: string, voteValue: VoteValue) => {
    if (requireAuth && !isAuthenticated) {
      // Show an error message or redirect to login
      console.error("Authentication required to vote");
      return;
    }

    // ... rest of the handleVote function ...
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={toggleViewMode}
          title={viewMode === "list" ? "Switch to Individual View" : "Switch to List View"}
          icon={viewMode === "list" ? <></> : <ListIcon className="stroke-white" />}
        />
      </div>
      <Voting
        statements={statements}
        pollId={pollId}
        requireAuth={requireAuth}
        initialVotes={initialVotes}
        viewMode={viewMode}
        handleVote={handleVote}
      />
    </div>
  );
}