import { verifyApiKey } from '@/lib/utils/api-keys';
import { prisma } from "./prisma";

export async function verifyApiKeyRequest(apiKey: string): Promise<{ modelId: string; isValid: boolean }> {
  // Find the API key record
  const keyRecord = await prisma.apiKey.findFirst({
    where: { enabled: true },
    include: { model: true }
  });

  if (!keyRecord) {
    return { modelId: "", isValid: false };
  }

  // Verify the key
  const isValid = await verifyApiKey(apiKey, keyRecord.key);
  
  if (!isValid) {
    return { modelId: "", isValid: false };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { uid: keyRecord.uid },
    data: { lastUsedAt: new Date() },
  });

  return { modelId: keyRecord.modelId, isValid: true };
} 