"use client";
import { useState } from "react";
import type { Poll } from "@prisma/client";

import { editPoll, publishPoll } from "../actions";
import Toggle from "@/lib/components/Toggle";
import Textarea from "./Textarea";
import Input from "./Input";

type Step = "create" | "settings" | "statements";

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex justify-between">
      <div className={step === "create" ? "bg-green-100" : "bg-gray-100"}>
        Step 1: Create
      </div>
      <div className={step === "settings" ? "bg-green-100" : "bg-gray-100"}>
        Step 2: Settings
      </div>
      <div className={step === "statements" ? "bg-green-100" : "bg-gray-100"}>
        Step 3: Statements
      </div>
    </div>
  );
}

export default function EditPoll({ poll }: { poll: Poll }) {
  const [step, setStep] = useState<Step>("create");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statements, setStatements] = useState<string>("");
  const [requireSMS, setRequireSMS] = useState<boolean>(false);
  const [allowParticipantStatements, setAllowParticipantStatements] =
    useState<boolean>(false);

  const contents =
    step === "create" ? (
      <div className="flex flex-col">
        <Input label="Title" value={title} setValue={setTitle} />
        <Textarea
          label="Description"
          value={description}
          setValue={setDescription}
        />
      </div>
    ) : step === "settings" ? (
      <div className="flex flex-col">
        <Toggle
          enabled={requireSMS}
          setEnabled={setRequireSMS}
          label="Require SMS"
        />
        <Toggle
          enabled={allowParticipantStatements}
          setEnabled={setAllowParticipantStatements}
          label="Allow participants to contribute statements?"
        />
      </div>
    ) : (
      <Textarea
        label="Statements"
        value={statements}
        setValue={setStatements}
      />
    );

  return (
    <div className="flex flex-col">
      <ProgressBar step={step} />
      {contents}
      {(step === "create" || step === "settings") && (
        <button
          onClick={async () => {
            await editPoll(poll.uid, {
              title,
              description,
              requireSMS,
              allowParticipantStatements,
            });
            setStep(step === "create" ? "settings" : "statements");
          }}
        >
          Continue
        </button>
      )}
      {step === "statements" && (
        <button
          onClick={() => {
            void publishPoll(poll.uid, statements);
          }}
        >
          Publish poll
        </button>
      )}
    </div>
  );
}
