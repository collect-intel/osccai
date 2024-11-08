import { ReactNode } from "react";
import { Crimson_Text } from "next/font/google";

const crimson = Crimson_Text({ subsets: ["latin"], weight: "400" });

interface ZoneWrapperProps {
  children: ReactNode;
  isActive: boolean;
  layout?: "vertical" | "horizontal";
  onToggle: () => void;
  savingStatus: "idle" | "saving" | "saved";
  subtitle?: string;
  title: string;
}

export default function ZoneWrapper({
  children,
  isActive,
  layout="horizontal",
  onToggle,
  subtitle,
  title,
  savingStatus,
}: ZoneWrapperProps) {
  const showColumnLayout = layout === 'horizontal';
  const flexDirection = showColumnLayout ? 'flex-row' : 'flex-col';
  return (
    <div
      className={`bg-off-white border rounded-lg p-4 pt-6 ${isActive ? "border-teal" : "border-gray-300"}`}
    >
      <div className={`flex ${flexDirection} gap-8`}>
        <div className={`flex flex-col gap-4 ${showColumnLayout ? 'w-1/4' : ''}`}>
          <h2 className={`text-xl ${crimson.className}`}>{title}</h2>
          {subtitle ? <h3 className="text-sm">{subtitle}</h3> : null}
        </div>
        {isActive && (
          <div className={showColumnLayout ? "w-3/4" : ""}>
            {children}
          </div>
        )}
      </div>
      {savingStatus !== "idle" && (
        <div className="mt-4 h-6 rounded-sm bg-teal/20 flex items-center justify-center">
          <span className="text-xs text-teal font-medium">
            {savingStatus === "saving" ? "Saving..." : "Saved"}
          </span>
        </div>
      )}
    </div>
  );
}
