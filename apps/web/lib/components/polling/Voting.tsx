"use client";
import { useState, useEffect } from "react";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Statement } from "@prisma/client";
import type { VoteValue } from "@prisma/client";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import {
  flagStatement,
  submitStatement,
  submitVote,
  checkPollCompletion,
} from "@/lib/actions";
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
import PollProgress from "./PollProgress";
import { FaCheckCircle } from "react-icons/fa";

interface VotingProps {
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

export default function Voting({
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
}: VotingProps) {
  const { isSignedIn } = useAuth();
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const [currentStatementIx, setCurrentStatementIx] = useState<number | null>(
    null,
  );
  const [statementText, setStatementText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const { isVisible, message, showToast } = useToast();

  const canVote = isSignedIn || !requireAuth;
  const votedCount = Object.keys(votes).length;

  // Fetch poll completion status
  const fetchPollStatus = async () => {
    try {
      const status = await checkPollCompletion(pollId, getAnonymousId());
      setIsComplete(status.isComplete);
      if (status.currentSubmissions !== undefined) {
        setSubmissionCount(status.currentSubmissions);
      }
    } catch (error) {
      console.error("Error checking completion status:", error);
    }
  };

  // Sync votes with initialVotes and fetch submission count
  useEffect(() => {
    setVotes(initialVotes);
    fetchPollStatus();
  }, [initialVotes, pollId]);

  // Check completion status after votes or submissions change
  useEffect(() => {
    if (canVote) {
      fetchPollStatus();
    }
  }, [pollId, votes, canVote]);

  // Add debug logging for votes and state
  useEffect(() => {
    console.log("=== Votes and State ===", {
      initialVotes,
      currentVotes: votes,
      votedCount,
      submissionCount,
      canVote,
      isComplete,
    });
  }, [initialVotes, votes, votedCount, submissionCount, canVote, isComplete]);

  // Optimize statement sorting to only handle needed statements
  const getNextUnvotedStatement = () => {
    if (!canVote) return null;

    // If we've reached vote limit, return null
    if (maxVotesPerParticipant && votedCount >= maxVotesPerParticipant) {
      return null;
    }

    // Get only unvoted statements
    const unvotedStatements = statements.filter((s) => !votes[s.uid]);

    // If no unvoted statements, return null
    if (unvotedStatements.length === 0) {
      return null;
    }

    // Sort unvoted statements by vote count and date
    const sortedUnvoted = unvotedStatements.sort((a, b) => {
      const totalVotesA = a.agreeCount + a.disagreeCount + a.passCount;
      const totalVotesB = b.agreeCount + b.disagreeCount + b.passCount;

      // First sort by total votes (ascending)
      if (totalVotesA !== totalVotesB) {
        return totalVotesA - totalVotesB;
      }

      // If total votes are equal, sort by creation date (ascending)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Return the first statement's index in the original array
    return statements.findIndex((s) => s.uid === sortedUnvoted[0].uid);
  };

  // Update the effect to use the optimized function
  useEffect(() => {
    const nextStatementIndex = getNextUnvotedStatement();
    setCurrentStatementIx(nextStatementIndex);

    // Add debug logging
    console.log("=== Next Statement Selection ===", {
      votedCount,
      maxVotesPerParticipant,
      remainingVotes: maxVotesPerParticipant
        ? maxVotesPerParticipant - votedCount
        : "unlimited",
      nextStatementIndex,
      nextStatement:
        nextStatementIndex !== null
          ? {
              id: statements[nextStatementIndex]?.uid,
              totalVotes: statements[nextStatementIndex]
                ? statements[nextStatementIndex].agreeCount +
                  statements[nextStatementIndex].disagreeCount +
                  statements[nextStatementIndex].passCount
                : null,
              createdAt: statements[nextStatementIndex]?.createdAt,
            }
          : null,
    });
  }, [canVote, statements, votes, maxVotesPerParticipant, votedCount]);

  // Add debug logging for statement sorting
  useEffect(() => {
    const sortedStatements = statements.sort((a, b) => {
      // Calculate total votes for each statement
      const totalVotesA = a.agreeCount + a.disagreeCount + a.passCount;
      const totalVotesB = b.agreeCount + b.disagreeCount + b.passCount;

      // First sort by total votes (ascending)
      if (totalVotesA !== totalVotesB) {
        return totalVotesA - totalVotesB;
      }

      // If total votes are equal, sort by creation date (ascending)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    console.log("=== Sorted Statements ===", {
      statements: sortedStatements.map((s) => ({
        id: s.uid,
        totalVotes: s.agreeCount + s.disagreeCount + s.passCount,
        createdAt: s.createdAt,
      })),
    });
  }, [statements]);

  // Calculate whether user can submit statements
  const canSubmitStatement =
    allowParticipantStatements &&
    canVote &&
    (!minVotesBeforeSubmission || votedCount >= minVotesBeforeSubmission) &&
    (!maxSubmissionsPerParticipant ||
      submissionCount < maxSubmissionsPerParticipant);

  // Add detailed debug logging for props and state
  useEffect(() => {
    console.log("=== Voting Component Props ===", {
      pollId,
      requireAuth,
      allowParticipantStatements,
      advancedOptions: {
        minVotesBeforeSubmission,
        maxVotesPerParticipant,
        maxSubmissionsPerParticipant,
        minRequiredSubmissions,
        completionMessage,
      },
      totalStatements: statements.length,
    });
  }, [
    pollId,
    requireAuth,
    allowParticipantStatements,
    minVotesBeforeSubmission,
    maxVotesPerParticipant,
    maxSubmissionsPerParticipant,
    minRequiredSubmissions,
    completionMessage,
    statements.length,
  ]);

  // Add detailed debug logging for state changes
  useEffect(() => {
    console.log("=== Voting Component State ===", {
      votedCount,
      submissionCount,
      canVote,
      isComplete,
      currentStatementIx,
      totalVotes: Object.keys(votes).length,
    });
  }, [
    votedCount,
    submissionCount,
    canVote,
    isComplete,
    currentStatementIx,
    votes,
  ]);

  const handleVote = async (vote: VoteValue) => {
    if (!canVote || currentStatementIx === null) return;

    try {
      const statementId = statements[currentStatementIx].uid;
      const previousVote = votes[statementId];

      await submitVote(statementId, vote, previousVote, getAnonymousId());
      setVotes({ ...votes, [statementId]: vote });

      const nextUnvotedIndex = statements.findIndex(
        (statement, index) =>
          index > currentStatementIx &&
          !votes[statement.uid] &&
          statement.uid !== statementId,
      );

      setCurrentStatementIx(
        nextUnvotedIndex >= 0 &&
          (!maxVotesPerParticipant ||
            Object.keys(votes).length < maxVotesPerParticipant)
          ? nextUnvotedIndex
          : null,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error submitting vote",
      );
    }
  };

  const handleSubmitStatement = async () => {
    try {
      await submitStatement(pollId, statementText, getAnonymousId());
      setStatementText("");
      setIsModalOpen(false);
      // Fetch actual submission count instead of optimistic update
      await fetchPollStatus();
      showToast("Statement submitted successfully");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Maximum submissions limit reached"
      ) {
        showToast("You have reached the maximum number of allowed submissions");
      } else {
        showToast(
          error instanceof Error ? error.message : "Error submitting statement",
        );
      }
    }
  };

  const hasVotedOnAll =
    statements.length > 0 &&
    statements.every((statement) => votes[statement.uid]);

  // Add useEffect for debugging
  useEffect(() => {
    console.log("=== Voting Component State ===");
    console.log("Advanced Options:", {
      minVotesBeforeSubmission,
      maxVotesPerParticipant,
      maxSubmissionsPerParticipant,
      allowParticipantStatements,
    });
    console.log("Current State:", {
      votedCount,
      submissionCount,
      canVote,
      hasVotedOnAll,
    });
    console.log("Votes Object:", votes);
    console.log("Total Statements:", statements.length);
  }, [
    minVotesBeforeSubmission,
    maxVotesPerParticipant,
    maxSubmissionsPerParticipant,
    allowParticipantStatements,
    votedCount,
    submissionCount,
    canVote,
    hasVotedOnAll,
    votes,
    statements.length,
  ]);

  // Add immediate logging after calculating canSubmitStatement
  useEffect(() => {
    console.log("=== Submit Statement Conditions ===");
    console.log("canSubmitStatement:", canSubmitStatement);
    console.log("Condition breakdown:", {
      allowParticipantStatements,
      canVote,
      minVotesCheck:
        !minVotesBeforeSubmission || votedCount >= minVotesBeforeSubmission,
      maxSubmissionsCheck:
        !maxSubmissionsPerParticipant ||
        submissionCount < maxSubmissionsPerParticipant,
    });
  }, [
    canSubmitStatement,
    allowParticipantStatements,
    canVote,
    minVotesBeforeSubmission,
    votedCount,
    maxSubmissionsPerParticipant,
    submissionCount,
  ]);

  const getSubmissionButtonTooltip = () => {
    const tooltip = !allowParticipantStatements
      ? "Statement submissions are not allowed in this poll"
      : !canVote
        ? "You must sign in to submit statements"
        : minVotesBeforeSubmission && votedCount < minVotesBeforeSubmission
          ? `You must vote on at least ${minVotesBeforeSubmission} statements before submitting your own`
          : maxSubmissionsPerParticipant &&
              submissionCount >= maxSubmissionsPerParticipant
            ? `You have reached the maximum limit of ${maxSubmissionsPerParticipant} submissions`
            : "Contribute a statement";

    // Log the tooltip calculation
    console.log("=== Tooltip Calculation ===", {
      resultingTooltip: tooltip,
      votedCount,
      minVotesBeforeSubmission,
      submissionCount,
      maxSubmissionsPerParticipant,
    });

    return tooltip;
  };

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
      <div key={currentStatementIx} className="animate-slide-in">
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

  const handleFlag = async (statementId: string) => {
    await flagStatement(statementId, getAnonymousId());
    showToast("Statement flagged");
  };

  const getRemainingVotesCount = () => {
    return statements.filter((statement) => !votes[statement.uid]).length;
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

      {currentStatementIx !== null && (
        <div className="flex justify-center items-center gap-4 text-xs text-gray font-mono font-medium mb-4">
          <div className="flex items-center gap-2">
            <StatementIcon className="fill-none stroke-gray" />
            {getRemainingVotesCount()} remaining
          </div>
        </div>
      )}

      <div className="flex flex-col rounded-md shadow-sm p-6 bg-light-beige relative">
        {currentStatementIx !== null && (
          <div className="absolute top-4 right-4">
            <div className="relative">
              <Toast message={message} isVisible={isVisible} />
              <button
                className="hover:bg-almost-white p-3 rounded stroke-gray hover:stroke-charcoal"
                onClick={() => {
                  handleFlag(statements[currentStatementIx].uid);
                }}
                disabled={!canVote}
              >
                <FlagIcon className="fill-none" />
              </button>
            </div>
          </div>
        )}
        <div>{renderContent()}</div>
      </div>

      {allowParticipantStatements && (
        <div className="flex flex-col items-center mt-8">
          <Button
            title={getSubmissionButtonTooltip()}
            onClick={() => setIsModalOpen(true)}
            disabled={!canSubmitStatement}
            icon={<PlusIcon className="w-5 h-5 stroke-white" />}
          />
          {!canSubmitStatement && canVote && (
            <p className="text-sm text-gray-600 mt-2">
              {getSubmissionButtonTooltip()}
            </p>
          )}
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
        <div className="p-6">
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
                onClick={handleSubmitStatement}
                disabled={!statementText.trim()}
                icon={<PlusIcon className="w-5 h-5 stroke-white" />}
              />
            </div>
          </div>
        </div>
      </Modal>

      <PollProgress
        totalStatements={statements.length}
        votedCount={votedCount}
        maxVotes={maxVotesPerParticipant}
        submissionCount={submissionCount}
        minRequiredSubmissions={minRequiredSubmissions}
        maxSubmissions={maxSubmissionsPerParticipant}
        isComplete={isComplete}
        completionMessage={completionMessage}
      />
    </>
  );
}
