import { getCommunityModel } from "@/lib/data";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import SimpleChatClient from "./SimpleChatClient";

export default async function SimplePublicModelChatPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId: clerkUserId } = auth();
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