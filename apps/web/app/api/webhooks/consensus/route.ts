import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/utils/server/webhooks";
import { createAndActivateConstitution } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { logGacScoreUpdated } from "@/lib/utils/server/eventLogger";

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
        console.log(`Processing statements_changed event for model ${payload.modelId}`);
        // Create and activate new constitution with bypassAuth option
        await createAndActivateConstitution(payload.modelId, { bypassAuth: true });
        break;
      case "gac_scores_updated":
        console.log(`Processing gac_scores_updated event for model ${payload.modelId}`);
        // Process GAC score updates
        if (payload.changedStatements && Array.isArray(payload.changedStatements)) {
          console.log(`Found ${payload.changedStatements.length} changed statements`);
          for (const change of payload.changedStatements) {
            console.log(`Processing statement ${change.statementId}, old score: ${change.oldScore}, new score: ${change.newScore}`);
            
            // Get the statement from the database
            const statement = await prisma.statement.findUnique({
              where: { uid: change.statementId },
            });
            
            if (statement) {
              console.log(`Found statement in database: ${statement.uid}`);
              // Convert null to undefined to match the expected type
              const oldScore = change.oldScore === null ? undefined : change.oldScore;
              
              // Log the GAC score update - now awaiting the async function
              await logGacScoreUpdated(
                statement,
                oldScore,
                change.newScore
              );
              console.log(`Logged GAC_SCORE_UPDATED event for statement ${statement.uid}`);
            } else {
              console.error(`Statement ${change.statementId} not found in database`);
            }
          }
        } else {
          console.warn(`No changedStatements found in payload for gac_scores_updated event`);
        }
        
        // Also check if we need to create a new constitution with bypassAuth option
        await createAndActivateConstitution(payload.modelId, { bypassAuth: true });
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
