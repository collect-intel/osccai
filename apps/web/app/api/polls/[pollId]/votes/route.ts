// apps/web/app/api/polls/[pollId]/votes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyApiKeyRequest } from "@/lib/api-auth";
import { submitVote } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { getOrCreateParticipant } from "@/lib/actions";
import { VoteValue } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    // First, get the poll and its associated community model
    const poll = await prisma.poll.findUnique({
      where: { uid: params.pollId },
      include: { communityModel: true }
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Verify API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
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
        { status: 403 }
      );
    }

    const body = await req.json();
    const { statementId, vote, anonymousId } = body;

    // Validate required fields
    if (!statementId) {
      return NextResponse.json(
        { error: "StatementId is required" },
        { status: 400 }
      );
    }

    if (!vote) {
      return NextResponse.json(
        { error: "Vote value is required" },
        { status: 400 }
      );
    }

    if (!anonymousId) {
      return NextResponse.json(
        { error: "AnonymousId is required" },
        { status: 400 }
      );
    }

    // Validate vote value
    if (!Object.values(VoteValue).includes(vote)) {
      return NextResponse.json(
        { error: "Invalid vote value" },
        { status: 400 }
      );
    }

    // Verify statement exists
    const statement = await prisma.statement.findUnique({
      where: { uid: statementId }
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    const participant = await getOrCreateParticipant(null, anonymousId);
    if (!participant) {
      return NextResponse.json(
        { error: "Failed to create participant" },
        { status: 500 }
      );
    }
    
    const result = await submitVote(statementId, vote, undefined, anonymousId);
    
    if (!result) {
      return NextResponse.json(
        { error: "Failed to submit vote" },
        { status: 500 }
      );
    }

    // Find the vote we just created/updated
    const latestVote = result.votes.find(v => v.participantId === participant.uid);
    if (!latestVote) {
      return NextResponse.json(
        { error: "Failed to find submitted vote" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uid: latestVote.uid,
      voteValue: latestVote.voteValue,
      createdAt: latestVote.createdAt
    });
  } catch (error) {
    console.error("Error in vote submission:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}