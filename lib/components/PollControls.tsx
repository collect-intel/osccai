"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import EditIcon from "@/lib/components/icons/EditIcon";
import ShareIcon from "@/lib/components/icons/ShareIcon";
import { useCopyToClipboard } from "../useCopyToClipboard";

export default function PollControls() {
  const pathname = usePathname();
  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleShare = () => {
    const currentUrl = window.location.href;
    copyToClipboard(currentUrl);
  };

  const buttonStyle =
    "flex items-center gap-1.5 text-sm font-medium fill-none stroke-[#121212]";

  return (
    <div className="flex items-center gap-6 self-end">
      <Link href={pathname + "/create"} className={buttonStyle}>
        <EditIcon />
        Edit
      </Link>
      <button className={buttonStyle} onClick={handleShare}>
        <ShareIcon />
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
