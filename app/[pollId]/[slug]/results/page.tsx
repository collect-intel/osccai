import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import PageTitle from "@/lib/components/PageTitle";
import IconCounter from "@/lib/components/IconCounter";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import { isCreator } from "@/lib/isCreator";
import { pollUrl } from "@/lib/links";
import ResultsControls from "@/lib/components/ResultsControls";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  const pollPath = pollUrl(poll);

  const isUserCreator = await isCreator(poll.creatorId);

  if (!isUserCreator) {
    redirect(pollPath);
  }

  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  return (
    <div className="flex flex-col">
      <ResultsControls poll={poll} />
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
    </div>
  );
}
