"use client";
import { useState } from "react";

import { Statement } from "@prisma/client";
import type { VoteValue } from "@prisma/client";
import { flagStatement, submitStatement, submitVote } from "../actions";
import StatementIcon from "./icons/StatementIcon";
import FlagIcon from "./icons/FlagIcon";
import QuestionIcon from "./icons/QuestionIcon";
import ThumbIcon from "./icons/ThumbIcon";
import Button from "./Button";
import PlusIcon from "./icons/PlusIcon";
import { useToast } from "../useToast";
import Toast from "./Toast";

function VoteButtons({ onClick }: { onClick: (vote: VoteValue) => void }) {
  const buttonStyle =
    "flex justify-center items-center gap-2 bg-black text-white text-sm font-medium p-2 min-w-[200px] rounded";
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex justify-center gap-10">
        <button className={buttonStyle} onClick={() => onClick("AGREE")}>
          <ThumbIcon className="stroke-white" /> I agree
        </button>
        <button className={buttonStyle} onClick={() => onClick("DISAGREE")}>
          <ThumbIcon className="stroke-white transform scale-y-[-1]" /> I
          disagree
        </button>
      </div>
      <button
        className="flex items-center gap-1 text-xs text-[#A4A4A4] hover:text-gray-500 font-medium fill-none stroke-[#A4A4A4] hover:stroke-gray-500"
        onClick={() => onClick("PASS")}
      >
        <QuestionIcon /> Skip, I&apos;m not sure
      </button>
    </div>
  );
}

export default function Voting({
  statements,
  pollId,
}: {
  statements: Statement[];
  pollId: string;
}) {
  const [currentStatementIx, setCurrentStatementIx] = useState(0);
  const [statementText, setStatementText] = useState("");
  const { isVisible, message, showToast } = useToast();

  const currentStatement =
    currentStatementIx >= statements.length ? (
      <div>You&apos;ve already voted on all statements!</div>
    ) : (
      <div>
        <div className="text-xl font-semibold mb-6">
          {statements[currentStatementIx].text}
        </div>
        <VoteButtons
          onClick={async (vote) => {
            submitVote(statements[currentStatementIx].uid, vote);
            setCurrentStatementIx(currentStatementIx + 1);
          }}
        />
      </div>
    );

  const currentStatementNumber = Math.min(
    currentStatementIx + 1,
    statements.length,
  );

  const handleFlag = async (statementId: string) => {
    await flagStatement(statementId);
    showToast("Statement flagged");
  };

  return (
    <>
      <div className="flex justify-between items-center text-lg font-semibold mb-6">
        <div>Vote on these statements</div>
        <Button
          onClick={() => console.log("Contribute")}
          title="Contribute a statement"
          icon={<PlusIcon className="stroke-white" />}
        />
      </div>
      <div className="flex flex-col rounded-2xl shadow-lg p-6">
        <div className="flex justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-[#A4A4A4] font-mono font-medium">
            <StatementIcon className="fill-none stroke-[#A4A4A4]" />{" "}
            {currentStatementNumber} of {statements.length}
          </div>
          <div className="relative">
            <Toast message={message} isVisible={isVisible} />
            <button
              className="hover:bg-[#F0F0F0] p-3 rounded stroke-[#A4A4A4] hover:stroke-[#121212]"
              onClick={() => handleFlag(statements[currentStatementIx].uid)}
            >
              <FlagIcon className="fill-none" />
            </button>
          </div>
        </div>
        <div>{currentStatement}</div>
      </div>
      {/* TODO - Chris: I have left this here until we find it a suitable home */}
      <div className="flex flex-col mt-6">
        <h2 className="text-lg">Add New Statement</h2>
        <textarea
          value={statementText}
          onChange={(e) => setStatementText(e.target.value)}
        />
        <button
          onClick={async () => {
            await submitStatement(pollId, statementText);
            setStatementText("");
          }}
        >
          Add
        </button>
      </div>
    </>
  );
}
