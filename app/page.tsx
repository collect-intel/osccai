import { prisma } from "@/lib/db";
import Form from "@/lib/components/Form";
import Link from "next/link";

export default async function Home() {
  const polls = await prisma.poll.findMany();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex flex-col">
        <h1 className="text-lg">OSCCAI</h1>
        {polls.length === 0 && <p>No polls found</p>}
        <ul>
          {polls.map((poll) => (
            <li key={poll.uid}>
              <h2>
                <Link href={`/${poll.uid}`}>{poll.title}</Link>
              </h2>
              <p>{poll.instructions}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <Form />
        </div>
      </div>
    </main>
  );
}
