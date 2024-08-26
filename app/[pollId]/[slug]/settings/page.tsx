import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProgressBar from "@/lib/components/ProgressBar";
import PageTitle from "@/lib/components/PageTitle";
import PollSettings from "@/lib/components/edit-poll/Settings";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();
  const pageTitle = poll.published ? "Edit Poll" : "New Poll";

  return (
    <div className="flex flex-col">
      <PageTitle title={pageTitle} />
      <ProgressBar step="settings" poll={poll} />
      <PollSettings poll={poll} />
    </div>
  );
}
