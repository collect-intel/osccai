"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import EditIcon from "@/lib/components/icons/EditIcon";
import ShareIcon from "@/lib/components/icons/ShareIcon";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import ResultsIcon from "./icons/ResultsIcon";
import { pollUrl } from "../links";

export const controlButtonStyle =
  "flex items-center gap-1.5 text-sm font-medium fill-none stroke-[#121212]";

export default function PollControls({ poll }: { poll: Poll }) {
  const pollPath = pollUrl(poll);

  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleShare = () => {
    const currentUrl = window.location.href;
    copyToClipboard(currentUrl);
  };

  return (
    <div className="flex items-center gap-6 self-end">
      <Link href={pollPath + "/create"} className={controlButtonStyle}>
        <EditIcon />
        Edit
      </Link>
      <Link href={pollPath + "/results"} className={controlButtonStyle}>
        <ResultsIcon />
        Results
      </Link>
      <button className={controlButtonStyle} onClick={handleShare}>
        <ShareIcon />
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
