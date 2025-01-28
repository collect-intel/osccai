// apps/web/app/api/polls/[pollId]/statements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyApiKeyRequest } from "@/lib/api-auth";
import { submitStatement } from "@/lib/actions";
import { prisma } from "@/lib/db";

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

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { content, anonymousId } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    if (!anonymousId) {
      return NextResponse.json(
        { error: "AnonymousId is required" },
        { status: 400 },
      );
    }

    // If this looks like an API request (has Authorization header)
    if (authHeader) {
      if (!authHeader.startsWith("Bearer ")) {
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
    }

    const result = await submitStatement(params.pollId, content, anonymousId);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to submit statement" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      uid: result.uid,
      text: result.text,
      status: result.status,
      createdAt: result.createdAt,
    });
  } catch (error) {
    console.error("Error in statement submission:", error);
    return NextResponse.json(
      { error: "Failed to submit statement" },
      { status: 500 },
    );
  }
}
