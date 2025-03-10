import React from "react";
import { FaCheckCircle, FaPencilAlt, FaVoteYea } from "react-icons/fa";

interface PollProgressProps {
  totalStatements: number;
  votedCount: number;
  maxVotes?: number;
  submissionCount: number;
  minRequiredSubmissions?: number;
  maxSubmissions?: number;
  isComplete: boolean;
  completionMessage?: string;
}

export default function PollProgress({
  totalStatements,
  votedCount,
  maxVotes,
  submissionCount,
  minRequiredSubmissions,
  maxSubmissions,
  isComplete,
  completionMessage,
}: PollProgressProps) {
  const effectiveMaxVotes = maxVotes || totalStatements;
  const voteProgress = Math.min((votedCount / effectiveMaxVotes) * 100, 100);

  const submissionProgress = minRequiredSubmissions
    ? Math.min((submissionCount / minRequiredSubmissions) * 100, 100)
    : 100;

  // Add debug logging
  React.useEffect(() => {
    console.log("=== Poll Progress State ===", {
      votedCount,
      maxVotes: effectiveMaxVotes,
      voteProgress,
      submissionCount,
      minRequiredSubmissions,
      submissionProgress,
      isComplete,
    });
  }, [
    votedCount,
    effectiveMaxVotes,
    voteProgress,
    submissionCount,
    minRequiredSubmissions,
    submissionProgress,
    isComplete,
  ]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="space-y-4">
        {/* Voting Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <FaVoteYea className="text-teal" />
              <span className="font-medium">Voting Progress</span>
            </div>
            <span className="text-sm text-gray-600">
              {votedCount} / {effectiveMaxVotes} votes
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal transition-all duration-500"
              style={{ width: `${voteProgress}%` }}
            />
          </div>
        </div>

        {/* Required Submissions Progress */}
        {minRequiredSubmissions !== undefined && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <FaPencilAlt className="text-teal" />
                <span className="font-medium">Required Submissions</span>
              </div>
              <span className="text-sm text-gray-600">
                {submissionCount} / {minRequiredSubmissions} statements
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal transition-all duration-500"
                style={{ width: `${submissionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submission Limit */}
        {maxSubmissions !== undefined && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Submission limit:</span>
            <span>
              {submissionCount} / {maxSubmissions} statements
            </span>
          </div>
        )}

        {/* Completion Status */}
        {isComplete && (
          <div className="mt-4 p-4 bg-light-teal rounded-md">
            <div className="flex items-center gap-2 text-teal mb-2">
              <FaCheckCircle />
              <span className="font-medium">Poll Complete!</span>
            </div>
            {completionMessage && (
              <p className="text-gray-700">{completionMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
