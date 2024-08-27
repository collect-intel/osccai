import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import Voting from "@/lib/components/Voting";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";
import PollControls from "@/lib/components/PollControls";
import { isCreator } from "@/lib/isCreator";

export default async function pollPage({
  params,
}: {
  params: { pollId: string };
}) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  if (!poll.published) {
    redirect(`/${poll.uid}/${poll.urlSlug}/create`);
  }

  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  const isUserCreator = await isCreator(poll.creatorId);

  return (
    <div className="flex flex-col">
      {isUserCreator && <PollControls />}
      <PageTitle title={poll.title} />
      <div className="flex gap-3 my-4">
        <IconCounter
          count={votes.length ?? 0}
          icon={<ParticipantIcon className="fill-none stroke-[#A4A4A4]" />}
        />
        <IconCounter
          count={statements.length ?? 0}
          icon={<StatementIcon className="fill-none stroke-[#A4A4A4]" />}
        />
      </div>
      <p className="text-sm whitespace-pre-wrap mb-8">{poll.description}</p>
      <Voting statements={statements} votes={votes} pollId={poll.uid} />
    </div>
  );
}
