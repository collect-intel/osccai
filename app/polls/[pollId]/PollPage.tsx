"use client";

import { useEffect, useState } from "react";
import { Statement, VoteValue } from "@prisma/client";
import VotingContainer from "@/lib/components/polling/VotingContainer";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";
import PollControls from "@/lib/components/polling/PollControls";
import { pollUrl } from "@/lib/links";
import BannerShareLink from "@/lib/components/BannerShareLink";
import AuthPrompt from "@/lib/components/AuthPrompt";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import { isPollOwner, fetchUserVotes } from "@/lib/actions";

interface PollPageProps {
  poll: {
    uid: string;
    title: string;
    description: string | null;
    published: boolean;
    requireAuth: boolean;
    allowParticipantStatements: boolean;
    statements: (Statement & { votes: { length: number } })[];
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
    communityModelId: string;
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

  const voteCount = poll.statements.reduce(
    (acc, statement) => acc + statement.votes.length,
    0,
  );

  const initialVotes = isLoggedIn ? userVotes : anonymousUserVotes;

  console.log("<PollPage> initialVotes", initialVotes);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col">
      <BannerShareLink />
      {isUserCreator && <PollControls poll={poll} />}
      <PageTitle title={poll.title} />
      <div className="flex gap-3 mb-4">
        <IconCounter
          count={voteCount}
          icon={<ParticipantIcon className="fill-none stroke-gray" />}
        />
        <IconCounter
          count={poll.statements.length}
          icon={<StatementIcon className="fill-none stroke-gray" />}
        />
      </div>
      <p className="text-sm whitespace-pre-wrap mb-8">{poll.description}</p>
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
  );
};

export default PollPage;
