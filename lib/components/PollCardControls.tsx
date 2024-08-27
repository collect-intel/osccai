"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import EditIcon from "./icons/EditIcon";
import ShareIcon from "./icons/ShareIcon";
import CheckIcon from "./icons/CheckIcon";
import { pollUrl } from "../links";

export default function PollCardControls({ poll }: { poll: Poll }) {
  const { copied, copyToClipboard } = useCopyToClipboard();

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
      <button onClick={handleShare}>
        {copied ? <CheckIcon className="w-[14px]" /> : <ShareIcon />}
      </button>
    </div>
  );
}
