import { notFound } from "next/navigation";
import Link from "next/link";
import PollList from "@/lib/components/polling/PollList";
import PageTitle from "@/lib/components/PageTitle";
import { getCommunityModel } from "@/lib/data";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import ConstitutionGenerator from "./ConstitutionGenerator";

export default async function CommunityModelPage({
  params,
}: {
  params: { modelId: string };
}) {
  const communityModel = await getCommunityModel(params.modelId);

  if (!communityModel) {
    notFound();
  }

  const activeConstitution =
    communityModel.activeConstitution || communityModel.constitutions[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title={`Community Model: ${communityModel.name}`} />
      <p className="mt-2 text-lg text-gray-600">
        Description: {communityModel.goal}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Created: {communityModel.createdAt.toLocaleDateString()}
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <ConstitutionGenerator modelId={communityModel.uid} />

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Constitutions</h2>
          </div>

          {communityModel.constitutions.length > 0 ? (
            <ul className="space-y-4">
              {communityModel.constitutions.map((constitution) => (
                <li key={constitution.uid}>
                  <Link
                    href={`/community-models/constitution/${constitution.uid}`}
                    className="block bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ease-in-out"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <ConstitutionIcon className="w-8 h-8 text-teal-600" />
                        <div>
                          <p className="text-lg font-medium text-blue-600">
                            Constitution v{constitution.version}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created:{" "}
                            {new Date(
                              constitution.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {constitution.uid ===
                        communityModel.activeConstitution?.uid && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">
              There are currently no constitutions for this community model.
            </p>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Polls</h2>
            <Link
              href={`/polls/create?modelId=${communityModel.uid}`}
              className="bg-teal-600 text-white font-medium py-2 px-4 rounded hover:bg-teal-700 transition-colors"
            >
              Create New Poll
            </Link>
          </div>
          <PollList polls={communityModel.polls} />
        </section>
      </div>
    </div>
  );
}
