import Link from 'next/link';
import { Poll } from '@prisma/client';

export default function PollList({ polls }: { polls: Poll[] }) {
  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold">Polls</h2>
      <ul>
        {polls.map((poll) => (
          <li key={poll.uid}>
            <Link href={`/polls/${poll.uid}`} className="text-blue-600 hover:underline">
              Poll: {poll.uid}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
