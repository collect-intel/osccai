import Link from "next/link";
import { pollUrl } from "../links";
import { Poll } from "@prisma/client";

type Step = "create" | "settings" | "statements";

export default function ProgressBar({
  poll,
  step,
}: {
  poll: Poll;
  step: Step;
}) {
  return (
    <div className="flex justify-between w-[400px] mx-auto my-10">
      <ProgressBarItem
        poll={poll}
        stage={1}
        isActive={step === "create"}
        label="Create"
      />
      <ProgressBarItem
        poll={poll}
        stage={2}
        isActive={step === "settings"}
        label="Settings"
      />
      <ProgressBarItem
        poll={poll}
        stage={3}
        isActive={step === "statements"}
        label="Statements"
      />
    </div>
  );
}

function ProgressBarItem({
  poll,
  isActive,
  label,
  stage,
}: {
  poll: Poll;
  isActive: boolean;
  label: string;
  stage: 1 | 2 | 3;
}) {
  return (
    <Link
      className="flex flex-col items-center gap-2 mb-4 w-[80px]"
      href={pollUrl(
        poll,
        stage === 1 ? "create" : stage === 2 ? "settings" : "statements",
      )}
    >
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
    </Link>
  );
}
