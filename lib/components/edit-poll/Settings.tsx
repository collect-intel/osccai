"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { editPoll } from "@/lib/actions";
import Toggle from "@/lib/components/Toggle";
import Button from "@/lib/components/Button";
import { Poll } from "@prisma/client";

export default function PollSettings({ poll }: { poll: Poll }) {
  const [requireSMS, setRequireSMS] = useState<boolean>(poll.requireSMS);
  const [allowParticipantStatements, setAllowParticipantStatements] =
    useState<boolean>(poll.allowParticipantStatements);
  const router = useRouter();

  return (
    <>
    <div className="flex flex-col gap-9">

      <Toggle
        enabled={requireSMS}
        setEnabled={setRequireSMS}
        label="Require participants to authenticate via SMS?"
        details={
          requireSMS
          ? "Yes, require authentication"
          : "No, don’t require authentication"
        }
        />
      <Toggle
        enabled={allowParticipantStatements}
        setEnabled={setAllowParticipantStatements}
        label="Allow participants to contribute statements?"
        details={
          allowParticipantStatements
          ? "Yes, allow contributions (participants must vote on 5 existing statements first)"
          : "No, don’t allow contributions"
        }
        />
        </div>
      <div className="ml-auto mt-6">
        <Button
          title="Continue"
          onClick={async () => {
            const updatedPoll = await editPoll(poll.uid, {
              requireSMS,
              allowParticipantStatements,
            });
            router.push(
              `/${updatedPoll.uid}/${updatedPoll.urlSlug}/statements`,
            );
          }}
        />
      </div>
    </>
  );
}
