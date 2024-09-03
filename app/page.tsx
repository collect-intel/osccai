import { prisma } from "@/lib/db";
import NewPollForm from "@/lib/components/NewPollForm";
import PageTitle from "@/lib/components/PageTitle";
import PollCard from "@/lib/components/PollCard";

export default async function Home() {
  const polls = await prisma.poll.findMany();

  return (
    <main>
      <div className="flex justify-between items-center mb-10">
        <PageTitle title="Polls" />

        {polls.length > 0 && <NewPollForm />}
      </div>
      {polls.length === 0 && (
        <div className="flex flex-col justify-center items-center h-80">
          <p className="text-gray font-medium mb-6">No polls found</p>
          <NewPollForm />
        </div>
      )}
      <ul className="grid grid-cols-3 gap-6">
        {polls.map((poll) => (
          <li key={poll.uid}>
            <PollCard poll={poll} />
          </li>
        ))}
      </ul>
    </main>
  );
}
