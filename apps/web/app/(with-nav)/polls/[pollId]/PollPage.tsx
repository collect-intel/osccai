"use client";

import { useEffect, useState } from "react";
import { Statement, VoteValue } from "@prisma/client";
import VotingContainer from "@/lib/components/polling/VotingContainer";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";
import VoteIcon from "@/lib/components/icons/VoteIcon";
import PollControls from "@/lib/components/polling/PollControls";
import { pollUrl } from "@/lib/links";
import BannerShareLink from "@/lib/components/BannerShareLink";
import AuthPrompt from "@/lib/components/AuthPrompt";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import { isPollOwner, fetchUserVotes } from "@/lib/actions";
import Link from "next/link";

interface PollPageProps {
  poll: {
    uid: string;
    title: string;
    published: boolean;
    requireAuth: boolean;
    allowParticipantStatements: boolean;
    statements: (Statement & { votes: { participantId: string }[] })[];
    communityModel: {
      bio: string;
      goal: string;
      name: string;
      uid: string;
    };
  };
  isLoggedIn: boolean;
  userVotes: Record<string, VoteValue>;
}

const PollPage: React.FC<PollPageProps> = ({ poll, isLoggedIn, userVotes }) => {
  const [isUserCreator, setIsUserCreator] = useState(false);
  const [anonymousUserVotes, setAnonymousUserVotes] = useState<
    Record<string, VoteValue>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      const anonymousId = getAnonymousId();
      const isCreator = await isPollOwner(poll.uid);
      setIsUserCreator(isCreator);

      console.log("isLoggedIn", isLoggedIn);
      console.log("anonymousId", anonymousId);
      console.log("votes", userVotes);

      if (!isLoggedIn) {
        const votes = await fetchUserVotes(poll.uid, anonymousId);
        console.log("non-logged-in votes", votes);
        setAnonymousUserVotes(votes as unknown as Record<string, VoteValue>);
      }
    };

    fetchData();
  }, [poll.uid, isLoggedIn]);

  const pollPath = pollUrl(poll);

  if (!poll.published) {
    // redirect(`${pollPath}/create`);
  }

  const participantCount = new Set(
    poll.statements.flatMap((statement) =>
      statement.votes.map((vote) => vote.participantId),
    ),
  ).size;

  const voteCount = poll.statements.reduce(
    (acc, statement) => acc + statement.votes.length,
    0,
  );

  const initialVotes = isLoggedIn ? userVotes : anonymousUserVotes;

  console.log("<PollPage> initialVotes", initialVotes);

  return (
    <div className="container mx-auto px-4 py-8">
      <BannerShareLink />
      <div className="bg-white rounded-md shadow-md p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-grow">
            <PageTitle title={poll.title} size="small" alignment="left" />
          </div>
          {isUserCreator && (
            <div className="flex gap-2 ml-4">
              <Link
                href={`/community-models/flow/${poll.communityModel.uid}#poll`}
                className="bg-teal text-white px-4 py-2 rounded"
              >
                Edit Poll
              </Link>
              <Link
                href={`/community-models/flow/${poll.communityModel.uid}#poll`}
                className="bg-teal text-white px-4 py-2 rounded"
              >
                View Results
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-6 mb-6 text-sm text-gray">
          <IconCounter
            count={participantCount}
            icon={<ParticipantIcon className="fill-none stroke-gray" />}
            label="voters"
          />
          <IconCounter
            count={poll.statements.length}
            icon={<StatementIcon className="fill-none stroke-gray" />}
            label="principles"
          />
        </div>

        <div className="mb-8">

          <h2 className="text-lg font-semibold mb-2">About the community</h2>
          <p className="text-sm whitespace-pre-wrap mb-4">{poll.communityModel.bio}</p>
          <h2 className="text-lg font-semibold mb-2">Goal of the model</h2>
          <p className="text-sm whitespace-pre-wrap mb-4">{poll.communityModel.goal}</p>
        </div>

        {poll.requireAuth && !isLoggedIn ? (
          <AuthPrompt message="You need to be logged in to vote on this poll." />
        ) : (
          <VotingContainer
            statements={poll.statements}
            pollId={poll.uid}
            requireAuth={poll.requireAuth}
            initialVotes={initialVotes}
            allowParticipantStatements={poll.allowParticipantStatements}
          />
        )}
      </div>
    </div>
  );
};

export default PollPage;
