"use client";

import { useSearchParams } from "next/navigation";

import Button from "./Button";
import CheckIcon from "./icons/CheckIcon";
import CopyIcon from "./icons/CopyIcon";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { useToast } from "../useToast";
import Toast from "./Toast";

export default function BannerShareLink() {
  const searchParams = useSearchParams();
  const { isVisible, message, showToast } = useToast();

  if (!searchParams.get("justPublished")) return null;

  const handleShare = () => {
    const currentUrl = window.location.href;
    copyToClipboard(currentUrl);
    showToast("Link copied!");
  };

  return (
    <div className="flex justify-between items-center p-2 mb-8 bg-light-blue rounded">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckIcon className="fill-none stroke-charcoal" />
        Your poll is published! Share it with participants to start collecting
        input.
      </div>
      <div className="relative">
        <Toast message={message} isVisible={isVisible} />
        <Button
          title="Copy share link"
          icon={<CopyIcon className="fill-none stroke-white" />}
          onClick={handleShare}
        />
      </div>
    </div>
  );
}
