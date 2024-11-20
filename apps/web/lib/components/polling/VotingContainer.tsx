"use client";

import Voting from "@/lib/components/polling/Voting";
import { Statement } from "@prisma/client";
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
  return (
    <div className="rounded-md">
      <div className="text-lg font-semibold mb-4">Vote on these statements</div>
      <Voting
        statements={statements}
        pollId={pollId}
        requireAuth={requireAuth}
        initialVotes={initialVotes}
        allowParticipantStatements={allowParticipantStatements}
      />
    </div>
  );
}
