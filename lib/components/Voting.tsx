"use client";
import { useState, useEffect } from "react";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Statement } from "@prisma/client";
import type { VoteValue } from "@prisma/client";
import { flagStatement, submitStatement, submitVote, fetchUserVotes } from "../actions";
import StatementIcon from "./icons/StatementIcon";
import FlagIcon from "./icons/FlagIcon";
import QuestionIcon from "./icons/QuestionIcon";
import ThumbIcon from "./icons/ThumbIcon";
import Button from "./Button";
import PlusIcon from "./icons/PlusIcon";
import Modal from "./Modal";
import { useToast } from "../useToast";
import Toast from "./Toast";
import { motion } from "framer-motion";
import VotingList from "./VotingList";

export default function Voting({
  statements,
  pollId,
  requireSMS,
  viewMode = "list",
  initialVotes,
}: {
  statements: Statement[];
  pollId: string;
  requireSMS: boolean;
  viewMode?: "list" | "individual";
  initialVotes: Record<string, VoteValue>;
}) {
  const { isSignedIn } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const [currentStatementIx, setCurrentStatementIx] = useState<number | null>(null);
  const [statementText, setStatementText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isVisible, message, showToast } = useToast();

  const canVote = !requireSMS || isSignedIn;

  useEffect(() => {
    if (canVote) {
      // Find the first statement without a vote
      const firstUnvotedIndex = statements.findIndex(statement => !votes[statement.uid]);
      setCurrentStatementIx(firstUnvotedIndex >= 0 ? firstUnvotedIndex : null);
    }
  }, [pollId, canVote, statements, votes]);

  const handleVote = async (vote: VoteValue) => {
    if (!canVote || currentStatementIx === null) return;
    const statementId = statements[currentStatementIx].uid;
    const previousVote = votes[statementId];
    setVotes({ ...votes, [statementId]: vote });
    await submitVote(statementId, vote, previousVote);

    // Find the next unvoted statement
    const nextUnvotedIndex = statements.findIndex((statement, index) => 
      index > currentStatementIx && !votes[statement.uid] && statement.uid !== statementId
    );
    setCurrentStatementIx(nextUnvotedIndex >= 0 ? nextUnvotedIndex : null);
  };

  const handleGoBack = () => {
    if (currentStatementIx === null || currentStatementIx === 0) return;
    const previousIndex = statements.findIndex((statement, index) => 
      index < currentStatementIx && votes[statement.uid]
    );
    setCurrentStatementIx(previousIndex >= 0 ? previousIndex : 0);
  };

  const currentStatement = currentStatementIx === null ? (
    <div className="text-center py-8">
      <h2 className="text-2xl font-bold mb-4">Thank you for participating!</h2>
      <p>You've already voted on all of these statements.</p>
    </div>
  ) : (
    <motion.div
      key={currentStatementIx}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-xl font-semibold mb-6">
        {statements[currentStatementIx].text}
      </div>
      <VoteButtons
        onClick={handleVote}
        disabled={!canVote}
        currentVote={votes[statements[currentStatementIx].uid]}
      />
    </motion.div>
  );

  const currentStatementNumber = currentStatementIx !== null ? currentStatementIx + 1 : 0;

  const handleFlag = async (statementId: string) => {
    await flagStatement(statementId);
    showToast("Statement flagged");
  };

  return (
    <>
      {!canVote && (
        <div className="bg-light-yellow border border-yellow rounded-lg p-4 mb-6 text-center">
          <p className="text-lg font-semibold mb-2">Join the conversation!</p>
          <p className="mb-4">You need an account to participate in this poll.</p>
          <div className="flex justify-center gap-4">
            <SignUpButton mode="modal">
              <button className="bg-teal text-white font-medium py-2 px-4 rounded hover:bg-teal-dark transition-colors">
                Sign up
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="bg-white text-teal border border-teal font-medium py-2 px-4 rounded hover:bg-light-teal transition-colors">
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-lg font-semibold mb-6">
        <div>Vote on these statements</div>
        <div>Debug: {JSON.stringify({ canVote, requireSMS: !!requireSMS, isSignedIn })}</div>
        <Button
          onClick={() => {
            if (!canVote) return;
            setIsModalOpen(true);
          }}
          title="Contribute a statement"
          icon={<PlusIcon className="stroke-white" />}
          disabled={!canVote}
        />
      </div>

      {viewMode === "list" ? (
        <VotingList
          statements={statements}
          pollId={pollId}
          initialVotes={votes}
          canVote={canVote}
        />
      ) : (
        <div className="flex flex-col rounded-2xl shadow-lg p-6 bg-light-beige">
          <div className="flex justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-gray font-mono font-medium">
              {currentStatementIx !== null && currentStatementIx > 0 && (
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-1 text-teal hover:text-teal-dark"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Go back
                </button>
              )}
              {currentStatementIx !== null && (
                <>
                  <StatementIcon className="fill-none stroke-gray" />{" "}
                  {currentStatementNumber} of {statements.length}
                </>
              )}
            </div>
            {currentStatementIx !== null && (
              <div className="relative">
                <Toast message={message} isVisible={isVisible} />
                <button
                  className="hover:bg-almost-white p-3 rounded stroke-gray hover:stroke-charcoal"
                  onClick={() => handleFlag(statements[currentStatementIx].uid)}
                  disabled={!canVote}
                >
                  <FlagIcon className="fill-none" />
                </button>
              </div>
            )}
          </div>
          <div>{currentStatement}</div>
        </div>
      )}

      {!canVote && (
        <div className="text-sm text-gray mt-4">
          You must{" "}
          <SignInButton mode="modal">
            <button className="text-teal underline">sign in</button>
          </SignInButton>{" "}
          to participate in this poll.
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-medium">
            Contribute a statement for participants to vote on
          </h2>
          <textarea
            value={statementText}
            onChange={(e) => setStatementText(e.target.value)}
            className="rounded-md min-h-48 min-w-[500px] border border-light-gray bg-yellow ring-1 ring-inset ring-light-gray placeholder:text-gray-400 focus:ring-inset focus:ring-teal focus:border-teal"
          />
          <div className="flex justify-end items-center gap-6">
            <button
              className="text-sm font-medium hover:bg-almost-white p-2 rounded"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>

            <Button
              onClick={async () => {
                await submitStatement(pollId, statementText);
                setStatementText("");
                setIsModalOpen(false);
              }}
              title="Add statement"
              icon={<PlusIcon className="stroke-white" />}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
