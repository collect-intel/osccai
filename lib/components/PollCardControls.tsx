"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import { copyToClipboard } from "@/lib/copyToClipboard";
import EditIcon from "./icons/EditIcon";
import ShareIcon from "./icons/ShareIcon";
import ResultsIcon from "./icons/ResultsIcon";
import { pollUrl } from "../links";

export default function PollCardControls({ poll }: { poll: Poll }) {
  const pollPath = pollUrl(poll);

  const handleShare = () => {
    const currentUrl = window.location.href + pollPath;
    copyToClipboard(currentUrl);
  };

  return (
    <div className="flex items-center gap-4">
      <Link href={pollPath + "/create"}>
        <EditIcon />
      </Link>
      <Link href={pollPath + "/results"}>
        <ResultsIcon />
      </Link>
      <button onClick={handleShare}>
        <ShareIcon />
      </button>
    </div>
  );
}
