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

  return <DefaultLayout fullWidth={isChatRoute}>{children}</DefaultLayout>;
}
