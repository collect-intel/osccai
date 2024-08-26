import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";

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
