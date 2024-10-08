import { prisma } from "@/lib/db";
import Link from "next/link";
import PageTitle from "@/lib/components/PageTitle";

export default async function LibraryPage() {
  const publishedModels = await prisma.communityModel.findMany({
    where: { published: true, deleted: false },
    select: {
      uid: true,
      name: true,
      goal: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Community Model Library" />
      <p className="mt-4 text-lg text-gray-600">
        Explore published community models and interact with their AI
        assistants.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publishedModels.map((model) => (
          <Link
            key={model.uid}
            href={`/library/${model.uid}`}
            className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100"
          >
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
              {model.name}
            </h2>
            <p className="font-normal text-gray-700">{model.goal}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
