"use client";

import { useState } from "react";
import Link from "next/link";

import { Poll } from "@prisma/client";
import ViewIcon from "@/lib/components/icons/ViewIcon";
import CSVIcon from "@/lib/components/icons/CSVIcon";
import Button from "@/lib/components/Button";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import { pollUrl } from "@/lib/links";
import { generateCsv } from "@/lib/actions";
import { controlButtonStyle } from "@/lib/components/polling/PollControls";
import { useToast } from "@/lib/useToast";
import Toast from "@/lib/components/Toast";

export default function ResultsControls({ poll }: { poll: Poll }) {
  const { isVisible, message, showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const pollPath = pollUrl(poll);

  const downloadCSV = async () => {
    setIsDownloading(true);
    try {
      const csvData = await generateCsv(poll.uid);

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.setAttribute("download", `poll-${poll.uid}.csv`);
      a.click();
    } catch (error) {
      console.error("Error downloading CSV:", error);
      showToast("Error downloading CSV");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-6 self-end">
      <Link href={pollPath} className={controlButtonStyle}>
        <ViewIcon />
        View poll
      </Link>
      <div className="relative">
        <Toast message={message} isVisible={isVisible} />
        <button onClick={downloadCSV} className={controlButtonStyle}>
          <CSVIcon />
          {isDownloading ? "Downloading..." : "Download CSV"}
        </button>
      </div>
      <Button
        icon={<ConstitutionIcon className="fill-none stroke-white" />}
        title="Generate constitution"
        disabled={!poll.published}
      />
    </div>
  );
}
