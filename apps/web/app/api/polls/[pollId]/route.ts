import { NextRequest, NextResponse } from "next/server";
import { verifyApiKeyRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { getPollData } from "@/lib/data";
import { getOrCreateParticipant, fetchUserVotes } from "@/lib/actions";

export async function POST(
  req: NextRequest,
  { params }: { params: { pollId: string } },
) {
  try {
    // First, get the poll and its associated community model
    const poll = await prisma.poll.findUnique({
      where: { uid: params.pollId },
      include: { communityModel: true },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Verify API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    const apiKey = authHeader.slice(7);
    const { modelId, isValid } = await verifyApiKeyRequest(apiKey);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Verify that the API key belongs to this community model
    if (modelId !== poll.communityModel.uid) {
      return NextResponse.json(
        { error: "API key is not authorized for this community model" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      uid: poll.uid,
      title: poll.title,
      description: poll.description,
      published: poll.published,
      communityModel: {
        uid: poll.communityModel.uid,
        name: poll.communityModel.name,
      },
    });
  } catch (error) {
    console.error("Error fetching poll:", error);
    return NextResponse.json(
      { error: "Failed to fetch poll" },
      { status: 500 },
    );
  }
}
