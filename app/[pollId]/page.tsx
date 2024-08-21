import Voting from "@/lib/components/Voting";
import EditPoll from "@/lib/components/EditPoll";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

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
      <h1>{poll.title}</h1>
      <p>{poll.description}</p>
      <Voting statements={statements} votes={votes} pollId={poll.uid} />
    </div>
  ) : (
    <EditPoll poll={poll} />
  );
}
