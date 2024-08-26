import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import ProgressBar from "@/lib/components/ProgressBar";
import PollStatements from "@/lib/components/edit-poll/Statements";

export default async function Page({ params }: { params: { pollId: string } }) {
  const [poll, existingStatementCount] = await Promise.all([
    prisma.poll.findUnique({
      where: { uid: params.pollId },
    }),
    prisma.statement.count({
      where: { pollId: params.pollId },
    }),
  ]);
  if (!poll || poll.deleted) return notFound();

  return (
    <div className="flex flex-col">
      <PageTitle title="New Poll" />
      <ProgressBar step="statements" poll={poll} />
      <PollStatements
        poll={poll}
        existingStatementCount={existingStatementCount}
      />
    </div>
  );
}
