import { notFound, redirect } from "next/navigation";
import {
  fetchUserVotes,
  getPollData,
  isPollOwner,
  getParticipantId,
} from "@/lib/data";
import VotingContainer from "@/lib/components/polling/VotingContainer";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";
import PollControls from "@/lib/components/polling/PollControls";
import { pollUrl } from "@/lib/links";
import BannerShareLink from "@/lib/components/BannerShareLink";
import AuthPrompt from "@/lib/components/AuthPrompt"; // New component to create

export default async function pollPage({
  params,
}: {
  params: { pollId: string };
}) {
  const poll = await getPollData(params.pollId);

  if (!poll) return notFound();

  const pollPath = pollUrl(poll);

  if (!poll.published) {
    // redirect(`${pollPath}/create`);
  }

  const isUserCreator = await isPollOwner(poll.uid);
  const participantId = await getParticipantId();

  const userVotes = await fetchUserVotes(poll.uid);

  const voteCount = poll.statements.reduce(
    (acc, statement) => acc + statement.votes.length,
    0,
  );

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
      {poll.requireAuth && !participantId ? (
        <AuthPrompt message="You need to be logged in to vote on this poll." />
      ) : (
        <VotingContainer
          statements={poll.statements}
          pollId={poll.uid}
          requireAuth={poll.requireAuth}
          initialVotes={userVotes}
          allowParticipantStatements={poll.allowParticipantStatements}
        />
      )}
    </div>
  );
}
