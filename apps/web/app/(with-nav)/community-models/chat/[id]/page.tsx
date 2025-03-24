import { getCommunityModel } from "@/lib/data";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import PublicModelChatClient from "./PublicModelChatClient";
import { SignInButton } from "@clerk/nextjs";

// This remains a Server Component
export default async function PublicModelChatPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId: clerkUserId } = auth();

  // If user is not authenticated, show sign-in prompt
  if (!clerkUserId) {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-soft-gray">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Sign in to Continue</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to interact with this Community Model.
          </p>
          <SignInButton mode="modal">
            <button className="bg-teal text-white px-6 py-2 rounded-lg hover:bg-teal-dark transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  let model;
  try {
    model = await getCommunityModel(params.id);

    if (!model?.uid) {
      console.error("No model found:", params.id, model);
      notFound();
    }
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

  return <PublicModelChatClient model={model} />;
}
