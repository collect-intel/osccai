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
  minVotesBeforeSubmission?: number;
  maxVotesPerParticipant?: number;
  maxSubmissionsPerParticipant?: number;
  minRequiredSubmissions?: number;
  completionMessage?: string;
}

export default function VotingContainer({
  statements,
  pollId,
  requireAuth,
  initialVotes,
  allowParticipantStatements,
  minVotesBeforeSubmission,
  maxVotesPerParticipant,
  maxSubmissionsPerParticipant,
  minRequiredSubmissions,
  completionMessage,
}: VotingContainerProps) {
  return (
    <div className="rounded-md">
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="h-px bg-light-gray flex-grow" />
        <div className="text-sm text-medium-gray whitespace-nowrap">
          Vote on these statements
        </div>
        <div className="h-px bg-light-gray flex-grow" />
      </div>

      <Voting
        statements={statements}
        pollId={pollId}
        requireAuth={requireAuth}
        initialVotes={initialVotes}
        allowParticipantStatements={allowParticipantStatements}
        minVotesBeforeSubmission={minVotesBeforeSubmission}
        maxVotesPerParticipant={maxVotesPerParticipant}
        maxSubmissionsPerParticipant={maxSubmissionsPerParticipant}
        minRequiredSubmissions={minRequiredSubmissions}
        completionMessage={completionMessage}
      />
    </div>
  );
}
