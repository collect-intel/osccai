import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PollForm from "@/lib/components/polling/PollForm";
import PageTitle from "@/lib/components/PageTitle";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
    include: { statements: true },
  });

  if (!poll || poll.deleted) return notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Edit Poll" />
      <PollForm poll={poll} communityModelId={poll.communityModelId} />
    </div>
  );
}
