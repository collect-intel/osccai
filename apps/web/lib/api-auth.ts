"use server";

import { verifyApiKey } from "@/lib/utils/server/api-keys";
import { prisma } from "@/lib/db";

export async function verifyApiKeyRequest(
  apiKey: string,
): Promise<{ modelId: string; isValid: boolean }> {
  // Get all active keys
  const activeKeys = await prisma.apiKey.findMany({
    where: { 
      status: 'ACTIVE',
    },
    include: { model: true }
  });

  // Try to verify against each active key
  for (const keyRecord of activeKeys) {
    const isValid = await verifyApiKey(apiKey, keyRecord.key);
    if (isValid) {

      console.log("API key verified successfully");

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { uid: keyRecord.uid },
        data: { lastUsedAt: new Date() },
      });
      return { modelId: keyRecord.modelId, isValid: true };
    }
  }

  console.log('No matching active API key found');
  return { modelId: "", isValid: false };
}
