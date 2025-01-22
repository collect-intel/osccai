import { createHmac, timingSafeEqual } from "crypto";

export interface WebhookPayload {
  event: string;
  modelId: string;
  pollId: string;
  timestamp: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  payload?: WebhookPayload;
}

const MAX_TIMESTAMP_AGE = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Verify a webhook signature and payload
 * @param signature The signature from the X-Webhook-Signature header
 * @param rawBody The raw request body as a string
 * @returns Object containing verification result and parsed payload if valid
 */
export function verifyWebhook(
  signature: string | null,
  rawBody: string,
): WebhookVerificationResult {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET environment variable not set");
    return { isValid: false, error: "Webhook secret not configured" };
  }

  if (!signature) {
    return { isValid: false, error: "Missing signature" };
  }

  // Create expected signature
  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Use timing-safe comparison
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { isValid: false, error: "Invalid signature" };
  }

  // Parse and validate payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return { isValid: false, error: "Invalid JSON payload" };
  }

  // Validate required fields
  if (!payload.event || !payload.modelId || !payload.pollId || !payload.timestamp) {
    return { isValid: false, error: "Missing required fields" };
  }

  // Validate timestamp is recent
  const timestamp = new Date(payload.timestamp).getTime();
  const now = Date.now();
  if (now - timestamp > MAX_TIMESTAMP_AGE) {
    return { isValid: false, error: "Webhook timestamp too old" };
  }

  return { isValid: true, payload };
} 