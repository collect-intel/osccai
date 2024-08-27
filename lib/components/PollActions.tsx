"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import EditIcon from "@/lib/components/icons/EditIcon";
import ShareIcon from "@/lib/components/icons/ShareIcon";

export default function PollActions({}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const copyUrlToClipboard = () => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy URL: ", err);
      });
  };

  return (
    <div className="flex items-center gap-6 self-end">
      <Link
        href={pathname + "/create"}
        className="flex items-center gap-1.5 text-sm font-medium fill-none stroke-[#121212]"
      >
        <EditIcon />
        Edit
      </Link>
      <button
        className="flex items-center gap-1.5 text-sm font-medium fill-none stroke-[#121212]"
        onClick={copyUrlToClipboard}
      >
        <ShareIcon />
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
