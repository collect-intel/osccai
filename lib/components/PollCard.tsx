import { Poll } from "@prisma/client";
import { prisma } from "@/lib/db";
import Button from "./Button";
import Link from "next/link";
import StatementIcon from "./icons/StatementIcon";
import ConstitutionIcon from "./icons/ConstitutionIcon";
import IconCounter from "./IconCounter";
import ParticipantIcon from "./icons/ParticipantIcon";
import PollCardControls from "./PollCardControls";
import { isCreator } from "../isCreator";

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
      color = "text-[#A4A4A4]";
    } else if (isPublished) {
      status = "Live";
      color = "text-[#008302]";
    } else {
      status = "Draft";
      color = "text-[#F3CE99]";
    }

    return (
      <div className="self-end flex items-center gap-1 text-xs text-[#A4A4A4] font-medium font-mono tracking-tighter">
        <div className={`text-xl ${color}`}>&bull;</div>
        {status}
      </div>
    );
  }

  const isUserCreator = await isCreator(poll.creatorId);

  return (
    <div className="flex flex-col bg-[#FAFAFA] p-6 rounded w-[284px]">
      <StatusIndicator isPublished={poll.published} isClosed={false} />
      <Link
        href={`/${poll.uid}/${poll.urlSlug}`}
        className="text-lg font-medium"
      >
        {poll.title}
      </Link>
      <div className="text-sm text-[#777777] my-6 pb-6 border-b border-[#E0E0E0]">
        {poll.description}
      </div>
      <div className="flex justify-between items-center mb-6 fill-none stroke-[#A4A4A4]">
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
