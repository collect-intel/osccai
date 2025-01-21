import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { verifyApiKeyRequest } from "@/lib/api-auth";
import { genSystemPrompt, processAIResponse } from "@/lib/constitutional-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("Processing chat completion request");
    // Verify API key from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid authentication. Expected Bearer token",
            type: "invalid_request_error",
          },
        }),
        { status: 401 },
      );
    }

    const apiKey = authHeader.slice(7);
    const { modelId, isValid } = await verifyApiKeyRequest(apiKey);

    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid API key",
            type: "invalid_request_error",
          },
        }),
        { status: 401 },
      );
    }

    // Get the model and verify API access is enabled
    const model = await prisma.communityModel.findUnique({
      where: { uid: modelId },
      include: { constitutions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!model?.apiEnabled) {
      return new Response(
        JSON.stringify({
          error: {
            message: "API access not enabled for this model",
            type: "invalid_request_error",
          },
        }),
        { status: 403 },
      );
    }

    // Parse request body
    const body = await req.json();
    const { messages, temperature = 0.7, max_tokens } = body;

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: {
            message: "messages must be an array",
            type: "invalid_request_error",
          },
        }),
        { status: 400 },
      );
    }

    // Generate system prompt from constitution
    const constitution = model.constitutions[0];
    const systemPrompt = genSystemPrompt(constitution.content);

    // Process through constitutional AI
    const response = await processAIResponse({
      messages,
      systemPrompt,
      temperature,
      maxTokens: max_tokens,
    });

    // Extract final_response from the XML structure
    let finalResponse = response.final_response;
    if (!finalResponse && response.content) {
      // If final_response is not directly available, try to parse it from content
      const match = response.content.match(/<final_response>([\s\S]*?)<\/final_response>/);
      finalResponse = match ? match[1].trim() : response.content;
    }

    // Format response in OpenAI-compatible way
    return new Response(
      JSON.stringify({
        id: "chatcmpl-" + crypto.randomUUID(),
        object: "chat.completion",
        created: Date.now(),
        model: model.name,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: finalResponse,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: -1, // We could implement token counting if needed
          completion_tokens: -1,
          total_tokens: -1,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Detailed API error:", error);
    // Ensure we always return JSON
    return new Response(
      JSON.stringify({
        error: {
          message:
            error instanceof Error ? error.message : "Internal server error",
          type: "internal_server_error",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
