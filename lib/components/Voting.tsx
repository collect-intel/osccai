"use client";
import { useState } from "react";

import { Statement, Vote } from "@prisma/client";
import { submitStatement, submitVote } from "../actions";
import type { VoteValue } from "@prisma/client";

const participantId = "TODO: participantId";

function VoteButtons({ onClick }: { onClick: (vote: VoteValue) => void }) {
  return (
    <div className="flex flex-row gap-2">
      <button onClick={() => onClick("AGREE")}>Agree</button>
      <button onClick={() => onClick("DISAGREE")}>Disagree</button>
      <button onClick={() => onClick("PASS")}>Pass</button>
    </div>
  );
}

export default function Voting({
  statements,
  votes,
  pollId,
}: {
  statements: Statement[];
  votes: Vote[];
  pollId: string;
}) {
  const [currentStatementIx, setCurrentStatementIx] = useState(0);
  const [statementText, setStatementText] = useState("");

  const currentStatement =
    currentStatementIx >= statements.length ? (
      <div>You&apos;ve already voted on all statements!</div>
    ) : (
      <div>
        {statements[currentStatementIx].text}
        <VoteButtons
          onClick={async (vote) => {
            submitVote(statements[currentStatementIx].uid, vote, participantId);
            setCurrentStatementIx(currentStatementIx + 1);
          }}
        />
      </div>
    );

  return (
    <div className="flex flex-col">
      {currentStatement}
      <div className="flex flex-col">
        <h2 className="text-lg">Add New Statement</h2>
        <textarea
          value={statementText}
          onChange={(e) => setStatementText(e.target.value)}
        />
        <button
          onClick={async () => {
            await submitStatement(pollId, statementText, participantId);
            setStatementText("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
