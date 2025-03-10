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

    console.log(
      `Triggering GAC update for poll ${pollId} at ${consensusServiceUrl}/api/update-gac-scores`,
    );

    // Add more detailed logging for debugging
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Running on server: ${typeof window === "undefined"}`);

    // Instead of using fetch directly, we'll use the built-in http module
    // This is a more reliable way to make HTTP requests in a Node.js environment
    return new Promise((resolve, reject) => {
      try {
        // Parse the URL to get host, port, and path
        const url = new URL(`${consensusServiceUrl}/api/update-gac-scores`);
        console.log(
          `Parsed URL: ${JSON.stringify({
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
          })}`,
        );

        // Prepare the request options
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.CONSENSUS_SERVICE_API_KEY && {
              "X-API-Key": process.env.CONSENSUS_SERVICE_API_KEY,
            }),
          },
        };

        console.log(`Request options: ${JSON.stringify(options)}`);

        // Prepare the request body
        const requestBody = JSON.stringify({
          pollId,
          force: true, // Force recalculation even if no new votes
        });

        // Create the request
        const http = require(url.protocol === "https:" ? "https" : "http");
        const req = http.request(options, (res: any) => {
          console.log(`Response status code: ${res.statusCode}`);

          let responseData = "";

          // Collect response data
          res.on("data", (chunk: Buffer) => {
            responseData += chunk;
          });

          // Process the complete response
          res.on("end", () => {
            console.log(`Response data: ${responseData}`);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsedData = JSON.parse(responseData);
                console.log("GAC update successful:", parsedData);

                // Revalidate the admin model page to show updated data
                revalidatePath(`/admin/models/[id]`);

                resolve({ success: true });
              } catch (parseError) {
                console.error("Failed to parse response:", parseError);
                resolve({
                  success: false,
                  error: "Failed to parse response from consensus service",
                });
              }
            } else {
              console.error(`HTTP error: ${res.statusCode}`);
              resolve({
                success: false,
                error: `HTTP error: ${res.statusCode}. ${responseData}`,
              });
            }
          });
        });

        // Handle request errors
        req.on("error", (error: Error) => {
          console.error("Request error:", error);
          resolve({
            success: false,
            error: `Request failed: ${error.message}`,
          });
        });

        // Set a timeout
        req.setTimeout(30000, () => {
          req.destroy();
          resolve({
            success: false,
            error: "Request timed out after 30 seconds",
          });
        });

        // Add Content-Length header to ensure the body is properly sent
        req.setHeader("Content-Length", Buffer.byteLength(requestBody));

        console.log(`Sending request body: ${requestBody}`);

        // Send the request body
        req.write(requestBody);
        req.end();
      } catch (error) {
        console.error("Error in HTTP request setup:", error);
        resolve({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error in request setup",
        });
      }
    });
  } catch (error) {
    console.error("Error triggering GAC update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
