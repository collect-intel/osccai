"use server";

import { requireAdmin } from "@/lib/utils/admin";
import { revalidatePath } from "next/cache";

/**
 * Triggers a GAC score update for a specific poll
 * This function calls the consensus service to recalculate GAC scores
 */
export async function triggerGacUpdate(pollId: string) {
  // Ensure the user is an admin
  await requireAdmin();

  try {
    // Determine the consensus service URL based on environment
    const isDevelopment = process.env.NODE_ENV === "development";
    
    // In development, use the local server
    // In production, use the Vercel-deployed service
    const consensusServiceUrl = isDevelopment
      ? "http://localhost:6000"  // Make sure this matches the port in local_server.py
      : process.env.CONSENSUS_SERVICE_URL || "https://osccai-consensus-service.vercel.app";
    
    console.log(`Triggering GAC update for poll ${pollId} at ${consensusServiceUrl}/api/update-gac-scores`);
    
    // Call the consensus service to trigger a GAC update
    const response = await fetch(`${consensusServiceUrl}/api/update-gac-scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add an API key or other authentication if needed
        ...(process.env.CONSENSUS_SERVICE_API_KEY && {
          "X-API-Key": process.env.CONSENSUS_SERVICE_API_KEY,
        }),
      },
      body: JSON.stringify({
        pollId,
        force: true, // Force recalculation even if no new votes
      }),
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorData;
      try {
        const textResponse = await response.text();
        console.log(`Error response text: ${textResponse}`);
        errorData = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorData = { error: "Failed to parse error response" };
      }
      throw new Error(`Failed to trigger GAC update: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    console.log("GAC update successful:", responseData);

    // Revalidate the admin model page to show updated data
    revalidatePath(`/admin/models/[id]`);
    
    return { success: true };
  } catch (error) {
    console.error("Error triggering GAC update:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
} 