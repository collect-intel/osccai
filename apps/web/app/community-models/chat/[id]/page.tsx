import { getCommunityModel } from "@/lib/data";
import ConstitutionalAIChat from "@/lib/components/chat/ConstitutionalAIChat";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import { notFound } from "next/navigation";
import ExpandableText from "@/lib/components/ExpandableText";
import { auth } from "@clerk/nextjs/server";

export default async function PublicModelChatPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId: clerkUserId } = auth();

  let model;
  try {
    model = await getCommunityModel(params.id);
  } catch (error) {
    console.error("Error fetching model:", error);
    notFound();
  }

  if (!model || !model.constitutions?.length) {
    console.log("No model or constitutions found:", model);
    notFound();
  }

  // Allow access if model is published OR if current user is the owner
  const isOwner = clerkUserId === model.owner.clerkUserId;
  if (!model.published && !isOwner) {
    console.log("Model is not published and user is not owner");
    notFound();
  }

  const latestConstitution = model.constitutions[0];

  if (!latestConstitution) {
    console.log("No constitution found");
    notFound();
  }

  // Add a draft/preview banner for unpublished models viewed by owner
  const PreviewBanner = () => {
    if (!model.published) {
      return (
        <div className="bg-yellow/20 text-black px-4 py-2 mb-4 rounded-lg text-sm">
          <span className="font-medium">Preview Mode</span> - This model is not
          yet published and only visible to you, as the community model owner.
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Info Panel */}
      <div className="lg:h-full lg:w-[400px] xl:w-[480px] lg:border-r bg-white lg:overflow-y-auto">
        <div className="p-4 lg:p-6">
          {/* Mobile-only header */}
          <div className="lg:hidden text-center mb-6">
            <PreviewBanner />
            <h1 className="text-xl font-medium mb-1">
              Chat with community model: {model.name}
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-600 text-xs mb-2">
              <ConstitutionIcon className="w-3 h-3" />
              <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                Constitution v{latestConstitution.version}
              </span>
            </div>
            <ExpandableText text={model.bio} />
          </div>

          {/* Desktop info panel content */}
          <div className="hidden lg:block">
            <PreviewBanner />
            <h1 className="text-2xl font-medium mb-4">{model.name}</h1>

            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-2">About</h2>
              <p className="text-gray-600 text-sm">{model.bio}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ConstitutionIcon className="w-4 h-4" />
                <h2 className="text-sm font-medium text-gray-900">
                  Constitution
                </h2>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  v{latestConstitution.version}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-600">
                <pre className="whitespace-pre-wrap text-sm font-normal">
                  {latestConstitution.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area - natural flow on mobile, fixed on desktop */}
      <div className="flex-1 bg-gray-50 lg:fixed lg:top-16 lg:right-0 lg:bottom-0 lg:left-[400px] xl:left-[480px]">
        <div className="h-full p-4">
          <ConstitutionalAIChat
            constitution={{
              text: latestConstitution.content,
              icon: <ConstitutionIcon />,
              color: "teal",
            }}
            initialMessages={[
              {
                role: "assistant",
                content: `Hi there! I'm an AI assistant aligned with ${model.name}'s constitutional values. How can I help you today?`,
              },
            ]}
            customStyles={{
              userMessage:
                "bg-white rounded-lg p-3 mb-4 shadow-sm border border-gray-100",
              aiMessage:
                "bg-teal rounded-lg p-3 mb-4 shadow-sm border border-teal-100 text-white",
              infoIcon: "text-teal-600 hover:text-teal-700 transition-colors",
            }}
          />
        </div>
      </div>
    </div>
  );
}
