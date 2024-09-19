"use client";

import { useState } from "react";
import Voting from "./Voting";
import { Statement } from "@prisma/client";
import Button from "./Button";
import ListIcon from "./icons/ListIcon";

type VotingContainerProps = {
  statements: Statement[];
  pollId: string;
  requireSMS: boolean;
  initialVotes: Record<string, VoteValue>;
};

export default function VotingContainer({
  statements,
  pollId,
  requireSMS,
  initialVotes,
}: VotingContainerProps) {
  const [viewMode, setViewMode] = useState<"list" | "individual">("list");

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "individual" : "list");
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
        requireSMS={requireSMS}
        initialVotes={initialVotes}
        viewMode={viewMode}
      />
    </div>
  );
}