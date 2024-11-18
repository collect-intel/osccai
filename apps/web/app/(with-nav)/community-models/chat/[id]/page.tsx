import { getCommunityModel } from "@/lib/data";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import PublicModelChatClient from "./PublicModelChatClient";

// This remains a Server Component
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

  return <PublicModelChatClient model={model} />;
}
