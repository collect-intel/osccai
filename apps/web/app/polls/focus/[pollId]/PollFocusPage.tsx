"use client";

import { useEffect, useState } from "react";
import { Statement, VoteValue } from "@prisma/client";
import VotingContainer from "@/lib/components/polling/VotingContainer";
import PageTitle from "@/lib/components/PageTitle";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import { fetchUserVotes } from "@/lib/actions";
import AuthPrompt from "@/lib/components/AuthPrompt";

interface PollFocusPageProps {
  poll: {
    uid: string;
    title: string;
    published: boolean;
    requireAuth: boolean;
    allowParticipantStatements: boolean;
    statements: Statement[];
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

const PollFocusPage: React.FC<PollFocusPageProps> = ({
  poll,
  isLoggedIn,
  userVotes,
}) => {
  const [anonymousUserVotes, setAnonymousUserVotes] = useState<
    Record<string, VoteValue>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoggedIn) {
        const anonymousId = getAnonymousId();
        const votes = await fetchUserVotes(poll.uid, anonymousId);
        setAnonymousUserVotes(votes as unknown as Record<string, VoteValue>);
      }
    };

    fetchData();
  }, [poll.uid, isLoggedIn]);

  const initialVotes = isLoggedIn ? userVotes : anonymousUserVotes;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-soft-gray">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-4 sm:p-8">
        <div className="mb-8 text-center">
          <PageTitle title={poll.title} size="small" alignment="center" />

          {/* About section */}
          <div className="mt-6 text-sm text-medium-gray">
            <h2 className="font-semibold text-charcoal mb-2">About</h2>
            <p className="whitespace-pre-wrap mb-4">
              {poll.communityModel.bio}
            </p>
          </div>

          {/* Goal section */}
          <div className="text-sm text-medium-gray">
            <h2 className="font-semibold text-charcoal mb-2">Goal</h2>
            <p className="whitespace-pre-wrap">{poll.communityModel.goal}</p>
          </div>
        </div>

        {poll.requireAuth && !isLoggedIn ? (
          <AuthPrompt message="You need to be logged in to vote on this poll." />
        ) : (
          <VotingContainer
            statements={poll.statements}
            pollId={poll.uid}
            requireAuth={poll.requireAuth}
            initialVotes={initialVotes}
            allowParticipantStatements={false}
          />
        )}
      </div>
    </div>
  );
};

export default PollFocusPage;
