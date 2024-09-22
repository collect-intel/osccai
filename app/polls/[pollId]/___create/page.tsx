export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
  });
  if (!poll || poll.deleted) return notFound();
  const pageTitle = poll.published ? "Edit Poll" : "New Poll";

  return (
    // ... existing JSX ...
  );
}