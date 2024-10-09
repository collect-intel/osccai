"use client";

import { useState } from "react";
import Voting from "@/lib/components/polling/Voting";
import { Statement } from "@prisma/client";
import Button from "@/lib/components/Button";
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
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={toggleViewMode}
          title={
            viewMode === "list"
              ? "Switch to Individual View"
              : "Switch to List View"
          }
          icon={
            viewMode === "individual" ? (
              <ListIcon className="stroke-white" />
            ) : (
              <></>
            )
          }
        />
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
