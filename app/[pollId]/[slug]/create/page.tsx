import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import ProgressBar from "@/lib/components/ProgressBar";
import PollCreate from "@/lib/components/edit-poll/Create";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();
  const pageTitle = poll.published ? "Edit Poll" : "New Poll";

  return (
    <div className="flex flex-col">
      <PageTitle title={pageTitle} />
      <ProgressBar step="create" poll={poll} />
      <PollCreate poll={poll} />
    </div>
  );
}
