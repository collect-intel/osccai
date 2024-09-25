import { useState, useMemo } from "react";
import { Statement, VoteValue } from "@prisma/client";
import { submitVote, flagStatement, submitStatement } from "@/lib/actions";
import ThumbIcon from "@/lib/components/icons/ThumbIcon";
import QuestionIcon from "@/lib/components/icons/QuestionIcon";
import FlagIcon from "@/lib/components/icons/FlagIcon";
import PlusIcon from "@/lib/components/icons/PlusIcon";
import { motion } from "framer-motion";
import { useToast } from "@/lib/useToast";
import Button from "@/lib/components/Button";
import Modal from "@/lib/components/Modal";

type VotingListProps = {
  statements: Statement[];
  pollId: string;
  initialVotes: Record<string, VoteValue>;
  canVote: boolean;
  allowParticipantStatements: boolean;
};

export default function VotingList({
  statements,
  pollId,
  initialVotes = {},
  canVote,
  allowParticipantStatements,
}: VotingListProps) {
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statementText, setStatementText] = useState("");

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
    return (
      statements.length > 0 &&
      statements.every((statement) => votes[statement.uid])
    );
  }, [statements, votes]);

  const renderContent = () => {
    if (statements.length === 0) {
      return (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">No statements yet</h2>
          <p>There are currently no statements to vote on in this poll.</p>
          {allowParticipantStatements && (
            <Button
              title="Add a statement"
              onClick={() => setIsModalOpen(true)}
              disabled={!canVote}
              icon={<PlusIcon className="w-5 h-5 stroke-white" />}
              className="mt-4"
            />
          )}
        </div>
      );
    }

    if (allVoted) {
      return (
        <div className="bg-light-teal p-4 rounded-lg text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Thank you for participating!
          </h2>
          <p>
            You've voted on all the statements. Feel free to review or change
            your votes below.
          </p>
          {allowParticipantStatements && (
            <Button
              title="Add another statement"
              onClick={() => setIsModalOpen(true)}
              disabled={!canVote}
              icon={<PlusIcon className="w-5 h-5 stroke-white" />}
              className="mt-4"
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {renderContent()}
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
                  onClick={() =>
                    handleVote(statement.uid, voteType as VoteValue)
                  }
                  disabled={!canVote}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {voteType === "AGREE" && (
                    <ThumbIcon
                      className={`inline mr-1 ${votes[statement.uid] === voteType ? "text-white" : ""}`}
                    />
                  )}
                  {voteType === "DISAGREE" && (
                    <ThumbIcon
                      className={`inline mr-1 transform scale-y-[-1] ${votes[statement.uid] === voteType ? "text-white" : ""}`}
                    />
                  )}
                  {voteType === "PASS" && (
                    <QuestionIcon
                      className={`inline mr-1 ${votes[statement.uid] === voteType ? "text-white" : ""}`}
                    />
                  )}
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold">
            Contribute a statement for participants to vote on
          </h2>
          <textarea
            value={statementText}
            onChange={(e) => setStatementText(e.target.value)}
            className="w-full rounded-md min-h-[150px] border border-light-gray bg-white ring-1 ring-inset ring-light-gray placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal focus:border-teal p-2"
            placeholder="Enter your statement here..."
          />
          <div className="flex justify-end items-center gap-4">
            <Button
              title="Cancel"
              onClick={() => setIsModalOpen(false)}
              variant="secondary"
            />
            <Button
              title="Add statement"
              onClick={async () => {
                await submitStatement(pollId, statementText);
                setStatementText("");
                setIsModalOpen(false);
              }}
              disabled={!statementText.trim()}
              icon={<PlusIcon className="w-5 h-5 stroke-white" />}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
