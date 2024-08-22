import { prisma } from "@/lib/db";
import Form from "@/lib/components/Form";
import Link from "next/link";
import PageTitle from "@/lib/components/PageTitle";
import PollCard from "@/lib/components/PollCard";

export default async function Home() {
  const polls = await prisma.poll.findMany();

  return (
    <main>
      <div className="flex justify-between items-center mb-10">
        <PageTitle title="Polls" />

        {polls.length > 0 && <Form />}
      </div>
      {polls.length === 0 && (
        <div className="flex flex-col justify-center items-center h-80">
          <p className="text-[#A4A4A4] font-medium mb-6">No polls found</p>
          <Form />
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
