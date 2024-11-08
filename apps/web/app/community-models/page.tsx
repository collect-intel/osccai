import { redirect } from "next/navigation";
import CommunityModelCard from "@/lib/components/CommunityModelCard";
import Link from "next/link";
import { getUserCommunityModels } from "@/lib/data";

export default async function CommunityModelsPage() {
  const communityModels = await getUserCommunityModels();

  if (communityModels === null) {
    redirect("/sign-in");
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">My Community Models</h1>

      <div className="bg-white border border-yellow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          What are Community Models?
        </h2>
        <p className="mb-4">
          Community Models are AI models shaped by collective input. They
          represent a shared vision of how AI should behave, based on the votes
          and contributions of community members.
        </p>
        <p className="mb-4">With your Community Models, you can:</p>
        <ul className="list-disc list-inside mb-4">
          <li>Create new models based on initial ideas</li>
          <li>Run polls to gather community input</li>
          <li>Refine and evolve your models over time</li>
          <li>Use these models to guide AI behavior in various applications</li>
        </ul>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">My Models</h2>
        <Link
          href="/community-models/flow"
          className="bg-teal text-white py-2 px-4 rounded hover:bg-teal-dark transition-colors"
        >
          + New Community Model
        </Link>
      </div>

      {communityModels.length === 0 ? (
        <p className="text-gray-600">
          You haven't created any Community Models yet. Why not start by
          creating one?
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {communityModels.map((model) => (
            <CommunityModelCard key={model.uid} model={model} />
          ))}
        </div>
      )}
    </>
  );
}
