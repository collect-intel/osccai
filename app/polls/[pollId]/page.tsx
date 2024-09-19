import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function SluglessPage({
  params,
}: {
  params: { pollId: string };
}) {

  console.log('SluglessPage poll??', params);

  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
    include: { communityModel: true },
  });

  if (!poll || poll.deleted) return notFound();

  // Redirect to the new URL structure
  redirect(`/polls/${params.pollId}/noslug`);
}
