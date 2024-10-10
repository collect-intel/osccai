import React, { useState, useEffect, useCallback } from "react";
import ZoneWrapper from "./ZoneWrapper";
import Link from "next/link";
import { copyToClipboard } from "@/lib/copyToClipboard";
import IconCounter from "@/lib/components/IconCounter";
import {
  FaUser,
  FaCommentAlt,
  FaShareAlt,
  FaSync,
  FaVoteYea,
} from "react-icons/fa";
import { Poll, Statement } from "@prisma/client";
import Button from "@/lib/components/Button";
import { fetchPollData } from "@/lib/actions";
import { isStatementConstitutionable } from "@/lib/utils/pollUtils";

interface PollZoneProps {
  isActive: boolean;
  onComplete: () => void;
  modelId: string;
  modelData: {
    name: string;
    bio: string;
    principles: string[];
    requireAuth: boolean;
    allowContributions: boolean;
  };
  pollData?: Poll & { statements: Statement[] }; // Update this type
  isExistingModel: boolean;
  onToggle: () => void;
  savingStatus: "idle" | "saving" | "saved";
  onUpdate: (updatedPollData: Partial<Poll>) => Promise<void>;
}

export default function PollZone({
  isActive,
  onComplete,
  modelId,
  modelData,
  pollData,
  isExistingModel,
  onToggle,
  savingStatus,
  onUpdate,
}: PollZoneProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [localPollData, setLocalPollData] = useState(pollData);
  const [showAllStatements, setShowAllStatements] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (pollData) {
      setLocalPollData(pollData);
    } else if (modelId && !localPollData) {
      handleCreatePoll();
    }
  }, [pollData, modelId]);

  const fetchUpdatedPollData = useCallback(async () => {
    if (modelId) {
      setIsRefreshing(true);
      try {
        // Implement this function in your actions file
        const updatedPollData = await fetchPollData(modelId);
        setLocalPollData(updatedPollData);
      } catch (error) {
        console.error("Error fetching updated poll data:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [modelId]);

  useEffect(() => {
    if (isActive) {
      const intervalId = setInterval(fetchUpdatedPollData, 30000); // 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [isActive, fetchUpdatedPollData]);

  const totalVotes =
    localPollData?.statements?.reduce(
      (sum: number, statement: Statement) =>
        sum +
        statement.agreeCount +
        statement.disagreeCount +
        statement.passCount,
      0,
    ) ?? 0;

  const uniqueParticipants =
    new Set(
      localPollData?.statements?.flatMap((statement) =>
        statement.votes?.map((vote) => vote.participantId),
      ),
    ).size ?? 0;

  const handleShare = () => {
    if (localPollData?.uid) {
      const pollUrl = `${window.location.origin}/polls/${localPollData.uid}`;
      copyToClipboard(pollUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const handleCreatePoll = async () => {
    const newPoll: Partial<Poll> = {
      title: `Poll for ${modelData.name}`,
      description: `This poll is for the community model: ${modelData.name}`,
      published: false,
      requireAuth: modelData.requireAuth,
      allowParticipantStatements: modelData.allowContributions,
    };
    const createdPoll = await onUpdate(newPoll);
    if (createdPoll !== undefined) {
      setLocalPollData(createdPoll);
    }
  };

  const sortedStatements =
    localPollData?.statements?.sort((a, b) => {
      const totalVotesA = a.agreeCount + a.disagreeCount + a.passCount;
      const totalVotesB = b.agreeCount + b.disagreeCount + b.passCount;
      return totalVotesB - totalVotesA; // Sort in descending order
    }) || [];

  const statementsToShow = showAllStatements
    ? sortedStatements
    : sortedStatements.slice(0, 5);

  const renderPollContent = () => {
    if (!localPollData?.uid) {
      return (
        <div
          className="bg-yellow border-l-4 border-teal text-charcoal p-4"
          role="alert"
        >
          <p className="font-bold">No Poll Available</p>
          <p>A poll hasn't been created for this community model yet.</p>
          <button
            onClick={handleCreatePoll}
            className="mt-4 bg-teal text-white px-4 py-2 rounded"
          >
            Create Poll
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="bg-light-blue p-4 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold">Poll: {localPollData.title}</p>
            <Button
              onClick={fetchUpdatedPollData}
              variant="secondary"
              icon={<FaSync className={isRefreshing ? "animate-spin" : ""} />}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh Poll Data"}
            </Button>
          </div>
          <div className="flex gap-3 mb-4">
            <IconCounter
              count={uniqueParticipants}
              icon={<FaUser className="text-gray-600" />}
            />
            <IconCounter
              count={localPollData.statements?.length || 0}
              icon={<FaCommentAlt className="text-gray-600" />}
            />
            <IconCounter
              count={totalVotes}
              icon={<FaVoteYea className="text-gray-600" />}
            />
          </div>
          <div className="flex space-x-2">
            {localPollData.uid && (
              <Link
                href={`/polls/${localPollData.uid}`}
                target="_blank"
                rel="noopener noreferrer"
                passHref
              >
                <Button variant="primary">View Poll</Button>
              </Link>
            )}
            <Button
              onClick={handleShare}
              variant="primary"
              icon={<FaShareAlt />}
            >
              {isCopied ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>
        {localPollData.statements && localPollData.statements.length > 0 ? (
          <div className="bg-white p-4 rounded-md shadow mt-4">
            <h3 className="text-xl font-semibold mb-4">
              {showAllStatements
                ? "All Statements"
                : "Most Voted-Upon Statements"}
            </h3>
            <ul className="space-y-4">
              {statementsToShow.map((statement, index) => {
                const total =
                  statement.agreeCount +
                  statement.disagreeCount +
                  statement.passCount;
                const agreeRatio = total > 0 ? statement.agreeCount / total : 0;
                const disagreeRatio =
                  total > 0 ? statement.disagreeCount / total : 0;
                const skipRatio = total > 0 ? statement.passCount / total : 0;

                const areAllEqual =
                  agreeRatio === disagreeRatio && disagreeRatio === skipRatio;
                const flexBasis = areAllEqual ? "33.33%" : "0%";

                const isConstitutionable =
                  isStatementConstitutionable(statement);

                return (
                  <li
                    key={index}
                    className="shadow rounded-lg flex flex-col overflow-hidden"
                  >
                    <div className="p-4 bg-soft-gray">
                      <p>{statement.text}</p>
                    </div>
                    <div className="flex text-white text-sm">
                      <div className="flex flex-grow">
                        <div
                          className="flex bg-agree-green"
                          style={{
                            flexGrow: agreeRatio,
                            flexBasis: flexBasis,
                            minWidth: areAllEqual ? "auto" : "60px",
                          }}
                        >
                          <span className="py-2 px-4 whitespace-nowrap">
                            Agree: {statement.agreeCount}
                          </span>
                        </div>
                        <div
                          className="flex bg-disagree-red"
                          style={{
                            flexGrow: disagreeRatio,
                            flexBasis: flexBasis,
                            minWidth: areAllEqual ? "auto" : "60px",
                          }}
                        >
                          <span className="py-2 px-4 whitespace-nowrap">
                            Disagree: {statement.disagreeCount}
                          </span>
                        </div>
                        <div
                          className="flex bg-skip-amber"
                          style={{
                            flexGrow: skipRatio,
                            flexBasis: flexBasis,
                            minWidth: areAllEqual ? "auto" : "60px",
                          }}
                        >
                          <span className="py-2 px-4 whitespace-nowrap">
                            Skip: {statement.passCount}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-1/4 py-2 px-4 text-center ${
                          isConstitutionable
                            ? "bg-slate-blue"
                            : "bg-medium-gray"
                        }`}
                      >
                        {isConstitutionable
                          ? "Constitutionable"
                          : "Not Constitutionable"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {localPollData.statements.length > 5 && (
              <Button
                onClick={() => setShowAllStatements(!showAllStatements)}
                variant="secondary"
                className="mt-4"
              >
                {showAllStatements
                  ? "Show Top 5 Most Voted-Upon Statements"
                  : "Show All Statements"}
              </Button>
            )}
          </div>
        ) : (
          <div
            className="bg-light-blue border-l-4 border-teal text-charcoal p-4 mt-4"
            role="alert"
          >
            <p className="font-bold">Poll Created</p>
            <p>
              Your poll has been created, but it doesn't have any statements
              yet. Statements will be added based on the principles you've
              defined.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <ZoneWrapper
      title="Poll Results"
      isActive={isActive}
      onToggle={onToggle}
      savingStatus={savingStatus}
    >
      <div className="flex">
        <div className="w-1/3 pr-4">
          <p className="text-gray-600">
            View and manage your community poll results here. Results update
            automatically every 30 seconds.
          </p>
        </div>
        <div className="w-2/3 space-y-4">
          {renderPollContent()}
          {!isExistingModel && localPollData && (
            <Button onClick={onComplete} variant="primary" className="mt-4">
              Next
            </Button>
          )}
        </div>
      </div>
    </ZoneWrapper>
  );
}
