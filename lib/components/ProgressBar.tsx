type Step = "create" | "settings" | "statements";

export default function ProgressBar({ step }: { step: Step }) {
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
