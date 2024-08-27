import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function OldPage({
  params,
}: {
  params: { pollId: string };
}) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();

  redirect(`/${params.pollId}/${poll.urlSlug}`);
}
