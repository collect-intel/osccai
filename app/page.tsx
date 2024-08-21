import { prisma } from "@/lib/db";
import Form from "@/lib/components/Form";
import Link from "next/link";
import PageTitle from "@/lib/components/PageTitle";
import Button from "@/lib/components/Button";

export default async function Home() {
  //const polls = await prisma.poll.findMany();

  return (
    <main >
   <div className="flex justify-between items-center">

        <PageTitle title="Polls" />

        <Button title="New poll" />
   </div>
        {/* {polls.length === 0 && <p>No polls found</p>}
        <ul>
          {polls.map((poll) => (
            <li key={poll.uid}>
              <h2>
                <Link href={`/${poll.uid}`}>{poll.title}</Link>
              </h2>
              <p>{poll.instructions}</p>
            </li>
          ))}
        </ul> */}
        <div className="mt-2 max-w-72 mx-auto">
          <Form />
        </div>
      
    </main>
  );
}
