import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import PageTitle from "@/lib/components/PageTitle";
import IconCounter from "@/lib/components/IconCounter";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import { isPollOwner } from "@/lib/actions";
import { pollUrl } from "@/lib/links";
import ResultsControls from "@/lib/components/ResultsControls";

export default async function Page({ params }: { params: { pollId: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { uid: params.pollId },
    include: {
      communityModel: { include: { owner: true } },
      statements: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        include: {
          votes: true,
        },
      },
    },
  });
  if (!poll || poll.deleted) return notFound();

  const pollPath = pollUrl(poll);

  const isUserCreator = await isPollOwner(poll.uid);

  if (!isUserCreator) {
    redirect(pollPath);
  }

  const totalVotes = poll.statements.reduce(
    (sum, statement) => sum + statement.votes.length,
    0,
  );

  return (
    <div className="flex flex-col">
      <ResultsControls poll={poll} />
      <PageTitle title={poll.title} />
      <div className="flex gap-3 my-4">
        <IconCounter
          count={totalVotes}
          icon={<ParticipantIcon className="fill-none stroke-gray" />}
        />
        <IconCounter
          count={poll.statements.length}
          icon={<StatementIcon className="fill-none stroke-gray" />}
        />
      </div>
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Statements and Results</h2>
        {poll.statements.length === 0 ? (
          <p>No statements have been submitted yet.</p>
        ) : (
          <ul className="space-y-4">
            {poll.statements.map((statement) => (
              <li key={statement.uid} className="border p-4 rounded-lg">
                <p className="mb-2">{statement.text}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Agree: {statement.agreeCount}</span>
                  <span>Disagree: {statement.disagreeCount}</span>
                  <span>Pass: {statement.passCount}</span>
                  <span>
                    GAC Score: {statement.gacScore?.toFixed(2) ?? "N/A"}
                  </span>
                  <span>
                    Priority Score:{" "}
                    {statement.priorityScore?.toFixed(2) ?? "N/A"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
