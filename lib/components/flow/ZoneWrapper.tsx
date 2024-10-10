import { ReactNode, useState, useEffect } from "react";
import SavingIndicator from "../SavingIndicator";

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
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (savingStatus === "saved") {
      setShowSaved(true);
      timer = setTimeout(() => {
        setShowSaved(false);
      }, 10000); // Hide after 10 seconds
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [savingStatus]);

  return (
    <div
      className={`bg-white border rounded-lg p-4 relative ${isActive ? "border-teal" : "border-gray-300"}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center">
          <div className="absolute bottom-2 left-2">
            {savingStatus === "saving" && <SavingIndicator status="saving" />}
            {showSaved && <SavingIndicator status="saved" />}
          </div>
          {/* <button onClick={onToggle} className="text-teal ml-2 ">
            {isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
          </button> */}
        </div>
      </div>
      {isActive && children}
    </div>
  );
}
