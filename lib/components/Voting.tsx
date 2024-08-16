"use client";
import { useState } from "react";

import { Statement, Vote } from "@prisma/client";
import { submitStatement, submitVote, type VoteType } from "../actions";

function VoteButtons({ onClick }: { onClick: (vote: VoteType) => void }) {
  return (
    <div className="flex flex-row gap-2">
      <button onClick={() => onClick("agree")}>Agree</button>
      <button onClick={() => onClick("disagree")}>Disagree</button>
      <button onClick={() => onClick("pass")}>Pass</button>
    </div>
  );
}

export default function Voting({
  statements,
  votes,
  surveyId,
}: {
  statements: Statement[];
  votes: Vote[];
  surveyId: string;
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
            submitVote(statements[currentStatementIx].uid, vote);
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
            await submitStatement(surveyId, statementText);
            setStatementText("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
