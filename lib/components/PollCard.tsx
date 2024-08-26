import { Poll } from "@prisma/client";
import { prisma } from "@/lib/db";
import Button from "./Button";
import Link from "next/link";
import StatementIcon from "./icons/StatementIcon";
import ConstitutionIcon from "./icons/ConstitutionIcon";
import IconCounter from "./IconCounter";
import ParticipantIcon from "./icons/ParticipantIcon";

export default async function PollCard({ poll }: { poll: Poll }) {
  const statements = await prisma.statement.findMany({
    where: { pollId: poll.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  return (
    <div className="bg-[#FAFAFA] p-6 rounded w-[284px]">
      <Link href={`/${poll.urlSlug}`} className="text-lg font-medium">
        {poll.title}
      </Link>
      <div className="text-sm text-[#777777] my-6 pb-6 border-b border-[#E0E0E0]">
        {poll.description}
      </div>
      <div className="flex gap-3 mb-6">
        <IconCounter
          count={votes.length}
          icon={<ParticipantIcon className="fill-none stroke-[#A4A4A4]" />}
        />
        <IconCounter
          count={statements.length}
          icon={<StatementIcon className="fill-none stroke-[#A4A4A4]" />}
        />
      </div>
      <div className="flex justify-center">
        <Button
          icon={<ConstitutionIcon className="fill-none stroke-white" />}
          title="Generate constitution"
          disabled
        />
      </div>
    </div>
  );
}
