import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/utils/server/webhooks";
import { createAndActivateConstitution } from "@/lib/actions";

export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get("X-Webhook-Signature");

    // Verify webhook
    const verificationResult = verifyWebhook(signature, rawBody);
    if (!verificationResult.isValid || !verificationResult.payload) {
      console.error("Webhook verification failed:", verificationResult.error);
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 401 },
      );
    }

    const { payload } = verificationResult;

    // Handle different event types
    switch (payload.event) {
      case "statements_changed":
        // Create and activate new constitution
        await createAndActivateConstitution(payload.modelId);
        break;
      default:
        console.warn(`Unknown webhook event type: ${payload.event}`);
        return NextResponse.json(
          { error: "Unknown event type" },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
