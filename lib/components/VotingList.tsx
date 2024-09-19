import { useState, useMemo } from "react";
import { Statement, VoteValue } from "@prisma/client";
import { submitVote, flagStatement } from "../actions";
import ThumbIcon from "./icons/ThumbIcon";
import QuestionIcon from "./icons/QuestionIcon";
import FlagIcon from "./icons/FlagIcon";
import { motion } from "framer-motion";
import { useToast } from "../useToast";

type VotingListProps = {
  statements: Statement[];
  pollId: string;
  initialVotes: Record<string, VoteValue>;
  canVote: boolean;
};

export default function VotingList({ statements, pollId, initialVotes = {}, canVote }: VotingListProps) {
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const { showToast } = useToast();

  const handleVote = async (statementId: string, vote: VoteValue) => {
    if (!canVote) return;
    const previousVote = votes[statementId];
    setVotes({ ...votes, [statementId]: vote });
    await submitVote(statementId, vote, previousVote);
  };

  const handleFlag = async (statementId: string) => {
    await flagStatement(statementId);
    showToast("Statement flagged");
  };

  const allVoted = useMemo(() => {
    return statements.every(statement => votes[statement.uid]);
  }, [statements, votes]);

  return (
    <div className="space-y-6">
      {allVoted && (
        <div className="bg-light-teal p-4 rounded-lg text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Thank you for participating!</h2>
          <p>You've voted on all the statements. Feel free to review or change your votes below.</p>
        </div>
      )}
      {statements.map((statement) => (
        <div key={statement.uid} className="bg-white p-4 rounded-lg shadow">
          <p className="text-lg mb-4">{statement.text}</p>
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              {["AGREE", "DISAGREE", "PASS"].map((voteType) => (
                <motion.button
                  key={voteType}
                  className={`px-3 py-1 rounded ${
                    votes[statement.uid] === voteType
                      ? "bg-teal text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                  onClick={() => handleVote(statement.uid, voteType as VoteValue)}
                  disabled={!canVote}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {voteType === "AGREE" && <ThumbIcon className={`inline mr-1 ${votes[statement.uid] === voteType ? "text-white" : ""}`} />}
                  {voteType === "DISAGREE" && <ThumbIcon className={`inline mr-1 transform scale-y-[-1] ${votes[statement.uid] === voteType ? "text-white" : ""}`} />}
                  {voteType === "PASS" && <QuestionIcon className={`inline mr-1 ${votes[statement.uid] === voteType ? "text-white" : ""}`} />}
                  {voteType}
                </motion.button>
              ))}
            </div>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => handleFlag(statement.uid)}
              disabled={!canVote}
            >
              <FlagIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}