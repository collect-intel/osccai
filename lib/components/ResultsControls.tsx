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

export default function ResultsControls({ poll }: { poll: Poll }) {
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

      // TODO: toast
    } catch (error) {
      console.error("Error downloading CSV:", error);
      // TODO: sad toast
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
      <button onClick={downloadCSV} className={controlButtonStyle}>
        <CSVIcon />
        {isDownloading ? "Downloading..." : "Download CSV"}
      </button>
      <Button
        icon={<ConstitutionIcon className="fill-none stroke-white" />}
        title="Generate constitution"
        disabled={!poll.published}
      />
    </div>
  );
}
