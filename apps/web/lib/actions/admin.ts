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
    // Get the consensus service URL from environment variables
    const consensusServiceUrl = process.env.CONSENSUS_SERVICE_URL;
    
    if (!consensusServiceUrl) {
      throw new Error("CONSENSUS_SERVICE_URL environment variable is not set");
    }
    
    console.log(`Triggering GAC update for poll ${pollId} at ${consensusServiceUrl}/api/update-gac-scores`);
    
    // Add a timeout to the fetch request to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
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
        signal: controller.signal,
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

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
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.error("Fetch request timed out after 30 seconds");
        throw new Error("Request to consensus service timed out. The service might be busy or unavailable.");
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("Error triggering GAC update:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
} 