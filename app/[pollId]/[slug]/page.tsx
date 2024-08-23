import Voting from "@/lib/components/Voting";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

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
    redirect(`/polls/${poll.uid}/create`);
  }

  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  return (
    <div className="flex flex-col">
      <h1>{poll.title}</h1>
      <p>{poll.description}</p>
      <Voting statements={statements} votes={votes} pollId={poll.uid} />
    </div>
  );
}
