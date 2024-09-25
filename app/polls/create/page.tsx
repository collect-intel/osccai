import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import PollForm from "@/lib/components/polling/PollForm";
import { getCommunityModel } from "@/lib/data";

export default async function CreatePollPage({
  searchParams,
}: {
  searchParams: { modelId: string };
}) {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { modelId } = searchParams;
  const communityModel = await getCommunityModel(modelId);

  if (!communityModel) {
    redirect("/community-models");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Create New Poll" />
      <PollForm
        communityModelId={modelId}
        poll={{
          uid: "",
          title: "",
          description: "",
          requireAuth: false,
          allowParticipantStatements: false,
          statements: [],
          // Add any other required fields with default values
        }}
      />
    </div>
  );
}
