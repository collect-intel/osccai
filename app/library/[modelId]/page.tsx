import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PageTitle from "@/lib/components/PageTitle";
import ChatInterface from "@/lib/components/chat/ChatInterface";

export default async function PublicCommunityModelPage({
  params,
}: {
  params: { modelId: string };
}) {
  const { modelId } = params;

  const communityModel = await prisma.communityModel.findUnique({
    where: { uid: modelId, published: true, deleted: false },
    include: {
      activeConstitution: true,
    },
  });

  if (!communityModel) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title={communityModel.name} />
      <p className="mt-4 text-lg text-gray-600">{communityModel.initialIdea}</p>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Chat with AI Assistant</h2>
        {communityModel.activeConstitution ? (
          "TODO:ChatInterface"
        ) : (
          <p className="text-gray-600">
            This community model doesn't have an active constitution yet.
          </p>
        )}
      </div>
    </div>
  );
}
