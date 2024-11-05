import { getCommunityModel } from "@/lib/data";
import ConstitutionalAIChat from "@/lib/components/chat/ConstitutionalAIChat";
import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import { notFound } from "next/navigation";

export default async function PublicModelChatPage({
  params,
}: {
  params: { id: string };
}) {
  let model;
  try {
    model = await getCommunityModel(params.id);
  } catch (error) {
    console.error('Error fetching model:', error);
    notFound();
  }

  if (!model || !model.constitutions?.length) {
    console.log('No model or constitutions found:', model);
    notFound();
  }

  const latestConstitution = model.constitutions[0];

  if (!latestConstitution) {
    console.log('No constitution found');
    notFound();
  }

  // Only show public models or if requireAuth is false
  if (model.requireAuth) {
    console.log('Model requires authentication');
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - becomes more compact on smaller screens */}
      <div className="text-center py-4 px-4 lg:py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-medium mb-1 lg:text-2xl">
            Chat with community model: {model.name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600 text-xs mb-2">
            <ConstitutionIcon className="w-3 h-3" />
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">
              Constitution v{latestConstitution.version}
            </span>
          </div>
          <p className="text-gray-600 text-sm max-w-2xl mx-auto line-clamp-2 hover:line-clamp-none">
            {model.bio}
          </p>
        </div>
      </div>
      
      {/* Chat area - goes edge to edge on small screens */}
      <div className="flex-grow bg-gray-50 sm:px-4">
        <div className="h-full max-w-4xl mx-auto bg-gray-50">
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
              userMessage: "bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100",
              aiMessage: "bg-teal rounded-lg p-4 mb-4 shadow-sm border border-teal-100 text-white",
              infoIcon: "text-teal-600 hover:text-teal-700 transition-colors",
            }}
          />
        </div>
      </div>
    </div>
  );
} 