import { prisma } from "./prisma";
import { compare } from "bcrypt";

export async function verifyApiKey(apiKey: string): Promise<{ modelId: string; isValid: boolean }> {
  const hashedKey = await compare(apiKey, "stored_hashed_key");
  
  const key = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { model: true },
  });

  if (!key || !key.enabled) {
    return { modelId: "", isValid: false };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { uid: key.uid },
    data: { lastUsedAt: new Date() },
  });

  return { modelId: key.modelId, isValid: true };
} 