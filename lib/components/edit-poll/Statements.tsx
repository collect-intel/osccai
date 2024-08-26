"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Textarea from "@/lib/components/Textarea";
import Button from "@/lib/components/Button";
import { publishPoll } from "@/lib/actions";
import { Poll } from "@prisma/client";

export default function PollStatements({ poll }: { poll: Poll }) {
  const [statements, setStatements] = useState<string>("");
  const router = useRouter();

  return (
    <>
      <Textarea
        label="Statements"
        description="Statements are prompts for participants to respond to (by selecting ‘agree’, ‘disagree’, or ‘pass’). Enter at least 5 to start."
        value={statements}
        setValue={setStatements}
      />
      <div className="ml-auto mt-6">
        <Button
          title="Publish poll"
          onClick={async () => {
            await publishPoll(poll.uid, statements);
            router.push(`/${poll.uid}/${poll.urlSlug}`);
          }}
        />
      </div>
    </>
  );
}
