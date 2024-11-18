"use client";

import DefaultLayout from "@/lib/components/DefaultLayout";
import { usePathname } from "next/navigation";

export default function CommunityModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatRoute = pathname?.includes("/chat/");

  if (isChatRoute) {
    return <div className="h-[calc(100dvh-4rem)]">{children}</div>;
  }

  return <DefaultLayout>{children}</DefaultLayout>;
}
