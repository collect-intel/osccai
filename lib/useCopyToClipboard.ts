import { useState } from "react";

export function useCopyToClipboard(duration = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), duration);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return { copied, copyToClipboard };
}
