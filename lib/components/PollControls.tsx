"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import EditIcon from "@/lib/components/icons/EditIcon";
import ShareIcon from "@/lib/components/icons/ShareIcon";
import { copyToClipboard } from "@/lib/copyToClipboard";
import ResultsIcon from "./icons/ResultsIcon";
import { pollUrl } from "../links";
import Toast from "./Toast";
import { useToast } from "../useToast";

export const controlButtonStyle =
  "flex items-center gap-1.5 text-sm font-medium fill-none stroke-charcoal";

export default function PollControls({ poll }: { poll: Poll }) {
  const pollPath = pollUrl(poll);
  const { isVisible, message, showToast } = useToast();

  const handleShare = () => {
    const currentUrl = window.location.href;
    copyToClipboard(currentUrl);
    showToast("Link copied!");
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
      <div className="relative">
        <Toast message={message} isVisible={isVisible} />
        <button className={controlButtonStyle} onClick={handleShare}>
          <ShareIcon />
          Share
        </button>
      </div>
    </div>
  );
}
