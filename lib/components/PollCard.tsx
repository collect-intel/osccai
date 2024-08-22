import { Poll } from "@prisma/client";
import Button from "./Button";
import Link from "next/link";

export default function PollCard({ poll }: { poll: Poll }) {
  return (
    <div className="bg-[#FAFAFA] p-6 rounded w-[284px]">
      <Link href={`/${poll.uid}`} className="text-lg font-medium">
        {poll.title}
      </Link>
      <div className="text-sm text-[#777777] my-6">{poll.description}</div>
      <div className="flex justify-center">
        <Button title="Generate constitution" disabled />
      </div>
    </div>
  );
}
