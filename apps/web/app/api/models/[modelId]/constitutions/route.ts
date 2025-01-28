import { NextRequest, NextResponse } from "next/server";
import { createAndActivateConstitution } from "@/lib/actions";
import { verifyApiKeyRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { modelId: string } },
) {
  try {
    const modelId = params.modelId;

    // Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    const apiKey = authHeader.slice(7);
    const { modelId: keyModelId, isValid } = await verifyApiKeyRequest(apiKey);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Verify that the API key belongs to this community model
    if (keyModelId !== modelId) {
      return NextResponse.json(
        { error: "API key is not authorized for this community model" },
        { status: 403 },
      );
    }

    // Create and activate new constitution
    const constitution = await createAndActivateConstitution(modelId);

    return NextResponse.json(constitution);
  } catch (error: any) {
    console.error("Error creating constitution:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create constitution" },
      { status: 500 },
    );
  }
}
