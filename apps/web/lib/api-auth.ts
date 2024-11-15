"use server";

import { verifyApiKey } from "@/lib/utils/server/api-keys";
import { prisma } from "@/lib/db";

export async function verifyApiKeyRequest(
  apiKey: string,
): Promise<{ modelId: string; isValid: boolean }> {
  // Find the API key record
  const keyRecord = await prisma.apiKey.findFirst({
    where: {
      status: "ACTIVE",
    },
    include: { model: true },
  });

  if (!keyRecord) {
    console.log("No active API key found");
    return { modelId: "", isValid: false };
  }

  // Verify the key
  const isValid = await verifyApiKey(apiKey, keyRecord.key);

  if (!isValid) {
    console.log("API key verification failed");
    return { modelId: "", isValid: false };
  }

  console.log("API key verified successfully");

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { uid: keyRecord.uid },
    data: { lastUsedAt: new Date() },
  });

  return { modelId: keyRecord.modelId, isValid: true };
}
