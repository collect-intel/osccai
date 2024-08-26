import Voting from "@/lib/components/Voting";
import EditPoll from "@/lib/components/EditPoll";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import IconCounter from "@/lib/components/IconCounter";

export default async function pollPage({
  params,
}: {
  params: { pollId: string };
}) {
  const poll = await prisma.poll.findUnique({
    where: { urlSlug: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  return poll.published ? (
    <div className="flex flex-col">
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
  ) : (
    <EditPoll poll={poll} />
  );
}
