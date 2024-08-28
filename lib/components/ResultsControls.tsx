"use client";

import { useState } from "react";
import Link from "next/link";

import { Poll } from "@prisma/client";
import ViewIcon from "./icons/ViewIcon";
import CSVIcon from "./icons/CSVIcon";
import Button from "./Button";
import ConstitutionIcon from "./icons/ConstitutionIcon";
import { pollUrl } from "../links";
import { generateCsv } from "@/lib/actions";
import { controlButtonStyle } from "./PollControls";
import { useToast } from "../useToast";
import Toast from "./Toast";

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
      a.setAttribute("download", `poll-${poll.urlSlug}.csv`);
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
