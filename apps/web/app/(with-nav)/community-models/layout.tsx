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
  const isFlowRoute = pathname?.includes("/flow/");

  if (isChatRoute || isFlowRoute) {
    return <div className="h-[calc(100dvh-4rem)]">{children}</div>;
  }

  return <DefaultLayout>{children}</DefaultLayout>;
}
