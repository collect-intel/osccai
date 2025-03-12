import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/utils/server/webhooks";
import { createAndActivateConstitution } from "@/lib/actions";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    console.log("Received webhook from consensus service");

    // Get raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get("X-Webhook-Signature");

    console.log(`Webhook signature: ${signature?.substring(0, 10)}...`);
    console.log(`Webhook body length: ${rawBody.length} characters`);

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
    console.log(`Webhook verified successfully. Event type: ${payload.event}`);

    // Handle different event types
    switch (payload.event) {
      case "statements_changed":
        console.log(
          `Processing statements_changed event for model ${payload.modelId}`,
        );
        // Create and activate new constitution with bypassAuth option
        await createAndActivateConstitution(payload.modelId, {
          bypassAuth: true,
        });
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
