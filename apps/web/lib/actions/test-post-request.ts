/**
 * This is a test script to verify POST requests to the consensus service
 * Run it with: npx tsx apps/web/lib/actions/test-post-request.ts
 */

import * as http from "http";

async function testPostRequest() {
  try {
    const consensusServiceUrl =
      process.env.CONSENSUS_SERVICE_URL || "http://localhost:6000";
    const pollId = "cm7yf3he90000h4yzb5oyurgi"; // Use the same poll ID as in your test

    console.log(
      `Testing POST request to consensus service at: ${consensusServiceUrl}`,
    );

    // Parse the URL
    const url = new URL(`${consensusServiceUrl}/api/update-gac-scores`);
    console.log(`Parsed URL:`, {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
    });

    // Prepare the request body
    const requestBody = JSON.stringify({
      pollId,
      force: true,
    });

    console.log(`Request body: ${requestBody}`);

    // Prepare the request options
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    console.log(`Request options:`, options);

    // Create a promise to handle the async request
    const result = await new Promise<{
      success: boolean;
      data?: any;
      error?: string;
    }>((resolve) => {
      const req = http.request(options, (res) => {
        console.log(`Response status code: ${res.statusCode}`);

        let responseData = "";

        // Collect response data
        res.on("data", (chunk) => {
          responseData += chunk;
        });

        // Process the complete response
        res.on("end", () => {
          console.log(`Response data: ${responseData}`);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(responseData);
              resolve({ success: true, data: parsedData });
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
      req.on("error", (error) => {
        console.error("Request error:", error);
        resolve({
          success: false,
          error: `Request failed: ${error.message}`,
        });
      });

      // Set a timeout
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          success: false,
          error: "Request timed out after 10 seconds",
        });
      });

      // Send the request body
      console.log("Writing request body...");
      req.write(requestBody);
      console.log("Ending request...");
      req.end();
    });

    console.log("Test result:", result);
    return result;
  } catch (error) {
    console.error("Test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Run the test
testPostRequest();
