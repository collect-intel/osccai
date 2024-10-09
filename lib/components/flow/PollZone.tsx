import React, { useState, useEffect } from "react";
import ZoneWrapper from "./ZoneWrapper";
import Link from "next/link";
import { copyToClipboard } from "@/lib/copyToClipboard";
import IconCounter from "@/lib/components/IconCounter";
import { FaUser, FaCommentAlt, FaShareAlt } from "react-icons/fa";
import { Poll, Statement } from "@prisma/client"; // Import these types
import Button from "@/lib/components/Button";

interface PollZoneProps {
  isActive: boolean;
  onComplete: () => void;
  modelId: string;
  modelData: {
    name: string;
    bio: string;
    principles: string[];
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

  useEffect(() => {
    if (!pollData && modelId) {
      handleCreatePoll();
    }
  }, [pollData, modelId]);

  useEffect(() => {
    if (pollData) {
      console.log("Poll data updated:", pollData);
      // You can add any additional logic here to update the component's state or trigger re-renders
    }
  }, [pollData]);

  const totalVotes =
    pollData?.statements?.reduce(
      (sum: number, statement: Statement) =>
        sum +
        statement.agreeCount +
        statement.disagreeCount +
        statement.passCount,
      0,
    ) ?? 0;

  const handleShare = () => {
    if (pollData?.uid) {
      const pollUrl = `${window.location.origin}/polls/${pollData.uid}`;
      copyToClipboard(pollUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const handlePollUpdate = async (updatedData: Partial<Poll>) => {
    if (!pollData) {
      // If there's no existing poll, we're creating a new one
      await onUpdate({
        ...updatedData,
        title: updatedData.title || `Poll for ${modelData.name}`,
        description:
          updatedData.description ||
          `This poll is for the community model: ${modelData.name}`,
      });
    } else {
      // If there's an existing poll, we're updating it
      await onUpdate({
        ...pollData,
        ...updatedData,
      });
    }
  };

  const handleCreatePoll = async () => {
    const newPoll: Partial<Poll> = {
      title: `Poll for ${modelData.name}`,
      description: `This poll is for the community model: ${modelData.name}`,
      published: false,
      requireAuth: true,
      allowParticipantStatements: true,
    };
    await onUpdate(newPoll);
  };

  const handleViewPoll = () => {
    // This function is no longer needed as we'll use a Link component
  };

  const handleViewResults = () => {
    if (pollData?.uid) {
      window.open(`/community-models/flow/${modelId}#poll`, "_blank");
    }
  };

  const renderPollContent = () => {
    if (!pollData) {
      return (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4"
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
          <p className="font-semibold mb-2">Poll: {pollData.title}</p>
          <div className="flex gap-3 mb-4">
            <IconCounter
              count={totalVotes}
              icon={<FaUser className="text-gray-600" />}
            />
            <IconCounter
              count={pollData.statements?.length || 0}
              icon={<FaCommentAlt className="text-gray-600" />}
            />
          </div>
          <div className="flex space-x-2">
            {pollData.uid && (
              <Link
                href={`/polls/${pollData.uid}`}
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
        {pollData.statements && pollData.statements.length > 0 ? (
          <div className="bg-white p-4 rounded-md shadow mt-4">
            <h3 className="text-xl font-semibold mb-4">Top Statements</h3>
            <ul className="space-y-4">
              {pollData.statements.slice(0, 5).map((statement, index) => (
                <li key={index} className="border p-4 rounded-lg">
                  <p className="mb-2">{statement.text}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Agree: {statement.agreeCount}</span>
                    <span>Disagree: {statement.disagreeCount}</span>
                    <span>Pass: {statement.passCount}</span>
                    <span>
                      GAC Score: {statement.gacScore?.toFixed(2) ?? "N/A"}
                    </span>
                    <span>
                      Constitutionable:{" "}
                      {statement.isConstitutionable ? "Yes" : "No"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mt-4"
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
            View and manage your community poll results here.
          </p>
        </div>
        <div className="w-2/3 space-y-4">
          {renderPollContent()}
          {!isExistingModel && pollData && (
            <Button onClick={onComplete} variant="primary" className="mt-4">
              Next
            </Button>
          )}
        </div>
      </div>
    </ZoneWrapper>
  );
}
