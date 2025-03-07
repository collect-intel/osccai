"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Check if the current user is an admin
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return false;
  }

  const owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  return owner?.isAdmin || false;
}

/**
 * Middleware to require admin access
 * @throws {Error} If the user is not an admin
 */
export async function requireAdmin() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    throw new Error("Admin access required");
  }
}

/**
 * Get all community models (admin only)
 * @returns {Promise<Array>} All community models
 */
export async function getAllCommunityModels() {
  await requireAdmin();

  const models = await prisma.communityModel.findMany({
    where: { deleted: false },
    include: {
      owner: {
        select: {
          uid: true,
          name: true,
          email: true,
          clerkUserId: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return models;
}

/**
 * Get a community model by ID (admin can access any model)
 * @param {string} modelId - The ID of the model to get
 * @returns {Promise<Object>} The community model
 */
export async function getCommunityModelAsAdmin(modelId: string) {
  await requireAdmin();

  const model = await prisma.communityModel.findUnique({
    where: { uid: modelId },
    include: {
      owner: {
        select: {
          uid: true,
          name: true,
          email: true,
          clerkUserId: true,
        },
      },
      activeConstitution: true,
      constitutions: true,
      polls: true,
      apiKeys: true,
    },
  });

  return model;
}
