import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProgressBar from "@/lib/components/ProgressBar";
import PageTitle from "@/lib/components/PageTitle";
import PollSettings from "@/lib/components/PollSettings";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  return (
    <div className="flex flex-col">
      <PageTitle title="New Poll" />
      <ProgressBar step="settings" />
      <PollSettings poll={poll} />
    </div>
  );
}
