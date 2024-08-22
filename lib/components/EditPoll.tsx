"use client";
import { useState } from "react";
import type { Poll } from "@prisma/client";

import { editPoll, publishPoll } from "../actions";
import Toggle from "@/lib/components/Toggle";
import Textarea from "./Textarea";
import Input from "./Input";
import PageTitle from "./PageTitle";
import Button from "./Button";

type Step = "create" | "settings" | "statements";

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex justify-between w-[400px] mx-auto my-10">
      <ProgressBarItem stage="1" isActive={step === "create"} label="Create" />
      <ProgressBarItem
        stage="2"
        isActive={step === "settings"}
        label="Settings"
      />
      <ProgressBarItem
        stage="3"
        isActive={step === "statements"}
        label="Statements"
      />
    </div>
  );
}
function ProgressBarItem({
  isActive,
  label,
  stage,
}: {
  isActive: boolean;
  label: string;
  stage: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 mb-4 w-[80px]">
      <div
        className={`rounded-full h-6 w-6 flex justify-center items-center text-mono text-xs text-white font-medium ${
          isActive ? "bg-[#185849]" : "bg-[#E0E0E0]"
        }`}
      >
        {stage}
      </div>
      <h2
        className={`text-sm font-medium ${
          isActive ? "text-[#185849]" : "text-[#E0E0E0]"
        }`}
      >
        {label}
      </h2>
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
        <Input
          label="Title"
          description="What is this poll about?"
          value={title}
          setValue={setTitle}
        />
        <Textarea
          label="Description"
          description="Help participants understand what you hope to achieve through this poll."
          value={description}
          setValue={setDescription}
        />
      </div>
    ) : step === "settings" ? (
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
    ) : (
      <Textarea
        label="Statements"
        description="Statements are prompts for participants to respond to (by selecting ‘agree’, ‘disagree’, or ‘pass’). Enter at least 5 to start."
        value={statements}
        setValue={setStatements}
      />
    );

  return (
    <div className="flex flex-col">
      <PageTitle title="New Poll" />
      <ProgressBar step={step} />
      {contents}
      <div className="ml-auto mt-6">
        {(step === "create" || step === "settings") && (
          <Button
            title="Continue"
            onClick={async () => {
              await editPoll(poll.uid, {
                title,
                description,
                requireSMS,
                allowParticipantStatements,
              });
              setStep(step === "create" ? "settings" : "statements");
            }}
          />
        )}
        {step === "statements" && (
          <Button
            title="Publish poll"
            onClick={() => {
              void publishPoll(poll.uid, statements);
            }}
          />
        )}
      </div>
    </div>
  );
}
