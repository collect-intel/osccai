import CommunityModelFlow from "@/lib/components/CommunityModelFlow";

export default function CommunityModelFlowPage({
  params,
}: {
  params: { id: string };
}) {
  return <CommunityModelFlow initialModelId={params.id} />;
}
