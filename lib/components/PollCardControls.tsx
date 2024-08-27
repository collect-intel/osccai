"use client";

import Link from "next/link";

import { Poll } from "@prisma/client";
import { useCopyToClipboard } from "../useCopyToClipboard";
import EditIcon from "./icons/EditIcon";
import ShareIcon from "./icons/ShareIcon";
import CheckIcon from "./icons/CheckIcon";

export default function PollCardControls({ poll }: { poll: Poll }) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  const pollPath = `/${poll.uid}` + `/${poll.urlSlug}`;

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
