"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Textarea from "@/lib/components/Textarea";
import Button from "@/lib/components/Button";
import { publishPoll } from "@/lib/actions";
import { Poll } from "@prisma/client";
import { pollUrl } from "@/lib/links";

export default function PollStatements({
  poll,
  existingStatementCount,
}: {
  poll: Poll;
  existingStatementCount: number;
}) {
  const [statements, setStatements] = useState<string>("");
  const router = useRouter();

  const description =
    existingStatementCount === 0
      ? "Statements are prompts for participants to respond to (by selecting ‘agree’, ‘disagree’, or ‘pass’). Enter at least 5 to start."
      : `Your poll already has ${existingStatementCount} statements. Add more?`;

  const pollPath = pollUrl(poll);

  return (
    <>
      <Textarea
        label="Statements"
        description={description}
        value={statements}
        setValue={setStatements}
      />
      <div className="ml-auto mt-6">
        <Button
          title={poll.published ? "Update poll" : "Publish poll"}
          onClick={async () => {
            await publishPoll(poll.uid, statements);
            router.push(pollPath);
          }}
        />
      </div>
    </>
  );
}
