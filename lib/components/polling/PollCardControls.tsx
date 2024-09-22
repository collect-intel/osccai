"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import { copyToClipboard } from "@/lib/copyToClipboard";
import EditIcon from "@/lib/components/icons/EditIcon";
import ShareIcon from "@/lib/components/icons/ShareIcon";
import ResultsIcon from "@/lib/components/icons/ResultsIcon";
import { pollUrl } from "@/lib/links";

export default function PollCardControls({ poll }: { poll: Poll }) {
  const pollPath = `/polls/${poll.uid}`;

  const handleShare = () => {
    const currentUrl = window.location.href + pollPath;
    copyToClipboard(currentUrl);
  };

  return (
    <div className="flex items-center gap-4">
      <Link href={pollPath + "/edit"}>
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
