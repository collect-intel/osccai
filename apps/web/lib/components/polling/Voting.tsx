"use client";
import { useState, useEffect } from "react";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Statement } from "@prisma/client";
import type { VoteValue } from "@prisma/client";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import { flagStatement, submitStatement, submitVote } from "@/lib/actions";
import StatementIcon from "../icons/StatementIcon";
import FlagIcon from "../icons/FlagIcon";
import Button from "../Button";
import PlusIcon from "../icons/PlusIcon";
import Modal from "../Modal";
import { useToast } from "../../useToast";
import Toast from "../Toast";
import VotingList from "@/lib/components/polling/VotingList";
import VoteButtons from "@/lib/components/polling/VoteButtons";
import ArrowLeftIcon from "../icons/ArrowLeftIcon";

export default function Voting({
  statements,
  pollId,
  requireAuth,
  viewMode = "list",
  initialVotes,
  allowParticipantStatements,
}: {
  statements: Statement[];
  pollId: string;
  requireAuth: boolean;
  viewMode?: "list" | "individual";
  initialVotes: Record<string, VoteValue>;
  allowParticipantStatements: boolean;
}) {
  const { isSignedIn } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const [currentStatementIx, setCurrentStatementIx] = useState<number | null>(
    null,
  );
  const [statementText, setStatementText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isVisible, message, showToast } = useToast();

  const canVote = isSignedIn || !requireAuth; // Everyone can vote now, as we handle anonymous users

  useEffect(() => {
    if (canVote) {
      // Find the first statement without a vote
      const firstUnvotedIndex = statements.findIndex(
        (statement) => !votes[statement.uid],
      );
      setCurrentStatementIx(firstUnvotedIndex >= 0 ? firstUnvotedIndex : null);
    }
  }, [pollId, canVote, statements, votes]);

  // Ensure that votes state reflects new initialVotes
  useEffect(() => {
    setVotes(prevVotes => ({ ...prevVotes, ...initialVotes }));
  }, [initialVotes]);

  const handleVote = async (vote: VoteValue) => {
    if (!canVote || currentStatementIx === null) return;
    const statementId = statements[currentStatementIx].uid;
    const previousVote = votes[statementId];
    setVotes({ ...votes, [statementId]: vote });
    await submitVote(statementId, vote, previousVote, getAnonymousId());

    // Find the next unvoted statement
    const nextUnvotedIndex = statements.findIndex(
      (statement, index) =>
        index > currentStatementIx &&
        !votes[statement.uid] &&
        statement.uid !== statementId,
    );
    setCurrentStatementIx(nextUnvotedIndex >= 0 ? nextUnvotedIndex : null);
  };

  const handleGoBack = () => {
    if (currentStatementIx === null || currentStatementIx === 0) return;
    setCurrentStatementIx(currentStatementIx - 1);
  };

  const hasVotedOnAll =
    statements.length > 0 &&
    statements.every((statement) => votes[statement.uid]);

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

    if (hasVotedOnAll) {
      return (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">
            Thank you for participating!
          </h2>
          <p>You&apos;ve voted on all the statements in this poll.</p>
        </div>
      );
    }

    return currentStatement;
  };

  const currentStatement =
    currentStatementIx === null ? (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">
          Thank you for participating!
        </h2>
        <p>You&apos;ve already voted on all of these statements.</p>
      </div>
    ) : (
      <div
        key={currentStatementIx}
        className="animate-slide-in"
      >
        <div className="text-lg mb-4 pr-12">
          {statements[currentStatementIx].text}
        </div>
        <VoteButtons
          onClick={handleVote}
          disabled={!canVote}
          currentVote={votes[statements[currentStatementIx].uid]}
        />
      </div>
    );

  const currentStatementNumber =
    currentStatementIx !== null ? currentStatementIx + 1 : 0;

  const handleFlag = async (statementId: string) => {
    await flagStatement(statementId, getAnonymousId());
    showToast("Statement flagged");
  };

  return (
    <>
      {!canVote && (
        <div className="bg-light-yellow border border-yellow rounded-md p-4 mb-6 text-center">
          <p className="text-lg font-semibold mb-2">Join the conversation!</p>
          <p className="mb-4">
            You need an account to participate in this poll.
          </p>
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
        {allowParticipantStatements && (
          <Button
            title="Contribute a statement"
            onClick={() => {
              if (!canVote) return;
              setIsModalOpen(true);
            }}
            disabled={!canVote}
            icon={<PlusIcon className="w-5 h-5 stroke-white" />}
          />
        )}
      </div>

      {viewMode === "list" ? (
        <div className="space-y-6">
          {statements.map((statement, index) => (
            <div 
              key={statement.uid} 
              className="flex flex-col rounded-md shadow-sm p-4 bg-light-beige"
            >
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-gray font-mono font-medium">
                  <StatementIcon className="fill-none stroke-gray" />
                  {index + 1} of {statements.length} principles
                </div>
                <div className="relative">
                  <Toast message={message} isVisible={isVisible} />
                  <button
                    className="hover:bg-almost-white p-2 rounded stroke-gray hover:stroke-charcoal"
                    onClick={() => handleFlag(statement.uid)}
                    disabled={!canVote}
                  >
                    <FlagIcon className="fill-none" />
                  </button>
                </div>
              </div>
              <div className="text-lg mb-4 pr-12">
                {statement.text}
              </div>
              <VoteButtons
                onClick={(vote) => handleVote(vote)}
                disabled={!canVote}
                currentVote={votes[statement.uid]}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          {currentStatementIx !== null && (
            <div className="flex justify-center items-center gap-4 text-xs text-gray font-mono font-medium mb-4">
              {currentStatementIx > 0 && (
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-1 text-teal hover:text-teal-dark"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Previous
                </button>
              )}
              <div className="flex items-center gap-2">
                <StatementIcon className="fill-none stroke-gray" />
                {currentStatementNumber} of {statements.length} principles
              </div>
              {currentStatementIx < statements.length - 1 && (
                <button
                  onClick={() => setCurrentStatementIx(currentStatementIx + 1)}
                  className="flex items-center gap-1 text-teal hover:text-teal-dark"
                >
                  Next <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                </button>
              )}
            </div>
          )}
          
          <div className="flex flex-col rounded-md shadow-sm p-6 bg-light-beige relative">
            <div className="absolute top-4 right-4">
              <div className="relative">
                <Toast message={message} isVisible={isVisible} />
                <button
                  className="hover:bg-almost-white p-3 rounded stroke-gray hover:stroke-charcoal"
                  onClick={() => {
                    if (currentStatementIx !== null) {
                      handleFlag(statements[currentStatementIx].uid);
                    }
                  }}
                  disabled={!canVote}
                >
                  <FlagIcon className="fill-none" />
                </button>
              </div>
            </div>
            <div>{renderContent()}</div>
          </div>
        </>
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
                await submitStatement(pollId, statementText, getAnonymousId());
                setStatementText("");
                setIsModalOpen(false);
              }}
              disabled={!statementText.trim()}
              icon={<PlusIcon className="w-5 h-5 stroke-white" />}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
