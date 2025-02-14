import { ReactNode } from "react";
import { Crimson_Text, DM_Sans } from "next/font/google";

const crimson = Crimson_Text({ subsets: ["latin"], weight: "400" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: "400" });

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
  layout = "horizontal",
  onToggle,
  subtitle,
  title,
  savingStatus,
}: ZoneWrapperProps) {
  const showColumnLayout = layout === "horizontal";

  return (
    <div
      className={`bg-off-white border rounded-lg p-4 pt-6 ${isActive ? "border-teal" : "border-gray-300"} ${dmSans.className}`}
    >
      <div
        className={`flex flex-col ${showColumnLayout ? "md:flex-row" : ""} gap-4 md:gap-8`}
      >
        {/* Title and subtitle section */}
        <div
          className={`flex flex-col gap-4 ${showColumnLayout ? "md:w-1/4" : ""}`}
        >
          <h2 className={`text-xl ${crimson.className}`}>{title}</h2>
          {subtitle ? (
            <div className="prose prose-sm max-w-none text-gray-600">
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Content section */}
        {isActive && (
          <div className={`${showColumnLayout ? "md:w-3/4" : "w-full"}`}>
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
