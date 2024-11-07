import { ReactNode } from "react";

interface ZoneWrapperProps {
  title: string;
  isActive: boolean;
  children: ReactNode;
  onToggle: () => void;
  savingStatus: "idle" | "saving" | "saved";
}

export default function ZoneWrapper({
  title,
  isActive,
  children,
  onToggle,
  savingStatus,
}: ZoneWrapperProps) {
  return (
    <div
      className={`bg-off-white border rounded-lg p-4 ${isActive ? "border-teal" : "border-gray-300"}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">{title}</h2>
      </div>
      {isActive && (
        <>
          {children}
          {savingStatus !== "idle" && (
            <div className="mt-4 h-6 rounded-sm bg-teal/20 flex items-center justify-center">
              <span className="text-xs text-teal font-medium">
                {savingStatus === "saving" ? "Saving..." : "Saved"}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
