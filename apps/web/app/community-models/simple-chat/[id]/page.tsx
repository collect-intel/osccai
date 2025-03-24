import { getCommunityModel } from "@/lib/data";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import SimpleChatClient from "./SimpleChatClient";
import { SignInButton } from "@clerk/nextjs";

export default async function SimplePublicModelChatPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId: clerkUserId } = auth();

  // If user is not authenticated, show sign-in prompt
  if (!clerkUserId) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-soft-gray">
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

  console.log("Attempting to fetch model:", params.id);

  let model;
  try {
    model = await getCommunityModel(params.id);
    console.log("Model fetched:", model);
  } catch (error) {
    console.error("Error fetching model:", error);
    notFound();
  }

  if (!model || !model.constitutions?.length) {
    console.log("No model or constitutions found. Model:", model);
    notFound();
  }

  // Allow access if model is published OR if current user is the owner
  const isOwner = clerkUserId === model.owner.clerkUserId;
  if (!model.published && !isOwner) {
    console.log("Model is not published and user is not owner");
    notFound();
  }

  return <SimpleChatClient model={model} />;
}
