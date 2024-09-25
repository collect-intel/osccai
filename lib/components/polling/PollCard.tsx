import { Poll } from "@prisma/client";
import { prisma } from "@/lib/db";
import Button from "@/lib/components/Button";
import Link from "next/link";
import StatementIcon from "@/lib/components/icons/StatementIcon";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import IconCounter from "@/lib/components/IconCounter";
import ParticipantIcon from "@/lib/components/icons/ParticipantIcon";
import PollCardControls from "./PollCardControls";
import { isCreator } from "@/lib/isCreator";

export default async function PollCard({ poll }: { poll: Poll }) {
  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  function StatusIndicator({
    isPublished,
    isClosed,
  }: {
    isPublished: boolean;
    isClosed: boolean;
  }) {
    let status, color;

    if (isClosed) {
      status = "Closed";
      color = "text-gray";
    } else if (isPublished) {
      status = "Live";
      color = "text-green";
    } else {
      status = "Draft";
      color = "text-peach";
    }

    return (
      <div className="self-end flex items-center gap-1 text-xs text-gray font-medium font-mono tracking-tighter">
        <div className={`text-xl ${color}`}>&bull;</div>
        {status}
      </div>
    );
  }

  const isUserCreator = await isCreator(poll.communityModelId);

  return (
    <div className="flex flex-col bg-soft-gray p-6 rounded w-[284px]">
      <StatusIndicator isPublished={poll.published} isClosed={false} />
      <Link href={`/polls/${poll.uid}`} className="text-lg font-medium">
        {poll.title}
      </Link>
      <div className="text-sm text-medium-gray my-6 pb-6 border-b border-light-gray">
        {poll.description}
      </div>
      <div className="flex justify-between items-center mb-6 fill-none stroke-gray">
        <div className="flex gap-3">
          <IconCounter count={votes.length} icon={<ParticipantIcon />} />
          <IconCounter count={statements.length} icon={<StatementIcon />} />
        </div>
        {isUserCreator && <PollCardControls poll={poll} />}
      </div>
      <div className="flex justify-center">
        <Button
          icon={<ConstitutionIcon className="fill-none stroke-white" />}
          title="Generate constitution"
          disabled={!poll.published}
        />
      </div>
    </div>
  );
}
