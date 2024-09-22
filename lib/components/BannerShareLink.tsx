"use client";

import { useSearchParams } from "next/navigation";

import Button from "@/lib/components/Button";
import CheckIcon from "@/lib/components/icons/CheckIcon";
import CopyIcon from "@/lib/components/icons/CopyIcon";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { useToast } from "@/lib/useToast";
import Toast from "@/lib/components/Toast";

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
