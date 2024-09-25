import DefaultLayout from "@/lib/components/DefaultLayout";

export default function CommunityModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
