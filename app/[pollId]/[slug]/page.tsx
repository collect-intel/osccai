import { notFound, redirect } from "next/navigation";

import Voting from "@/lib/components/Voting";
import { prisma } from "@/lib/db";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";
import PollActions from "@/lib/components/PollActions";

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

  return (
    <div className="flex flex-col">
      <PollActions />
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
