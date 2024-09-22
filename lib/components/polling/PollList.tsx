'use client';

import Link from 'next/link';
import { Poll } from '@prisma/client';
import StatementIcon from '@/lib/components/icons/StatementIcon';
import ParticipantIcon from '@/lib/components/icons/ParticipantIcon';

// Extend the Poll type to include optional statements
interface ExtendedPoll extends Poll {
  statements?: Array<{ votes?: any[] }>;
}

export default function PollList({ polls }: { polls: ExtendedPoll[] }) {
  const handleDelete = (pollId: string) => {
    // Implement delete functionality here
    console.log(`Delete poll with ID: ${pollId}`);
  };

  return (
    <div className="mt-4">
      <ul className="space-y-4">
        {polls.map((poll) => (
          <li key={poll.uid} className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center">
              <Link href={`/polls/${poll.uid}`} className="flex-grow">
                <h3 className="text-lg font-semibold text-teal-600 hover:text-teal-800">{poll.title}</h3>
                {poll.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {poll.description.length > 100
                      ? `${poll.description.substring(0, 100)}...`
                      : poll.description}
                  </p>
                )}
              </Link>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <StatementIcon className="w-4 h-4 stroke-gray-500" />
                  <span className="text-sm text-gray-600">{poll.statements?.length || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ParticipantIcon className="w-4 h-4 stroke-gray-500" />
                  <span className="text-sm text-gray-600">
                    {poll.statements?.reduce((acc, statement) => acc + (statement.votes?.length || 0), 0) || 0}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
