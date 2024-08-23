import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import ProgressBar from "@/lib/components/ProgressBar";
import PollStatements from "@/lib/components/PollStatements";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  return (
    <div className="flex flex-col">
      <PageTitle title="New Poll" />
      <ProgressBar step="statements" />
      <PollStatements poll={poll} />
    </div>
  );
}
