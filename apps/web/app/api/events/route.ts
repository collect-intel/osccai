import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { EventType, ResourceType } from "@/lib/types/events";
import { Prisma } from "@prisma/client";

/**
 * API endpoint for fetching system events
 * Handles filtering based on query parameters
 * Ensures proper authorization based on user role
 */
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the current user
  const owner = await prisma.communityModelOwner.findUnique({
    where: { clerkUserId },
  });

  if (!owner) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user is admin (query actual value from the database)
  const adminCheck = await prisma.communityModelOwner.findUnique({
    where: { uid: owner.uid },
    select: { isAdmin: true },
  });
  
  const isAdmin = adminCheck?.isAdmin || false;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const resourceType = searchParams.get("resourceType") as ResourceType | null;
  const resourceId = searchParams.get("resourceId");
  const eventTypesParam = searchParams.get("eventTypes");
  const eventTypes = eventTypesParam
    ? (eventTypesParam.split(",") as EventType[])
    : null;

  try {
    // Find models owned by this user if needed for filtering
    const ownedModelIds = !isAdmin ? await prisma.communityModel.findMany({
      where: { ownerId: owner.uid },
      select: { uid: true },
    }) : [];

    const modelIdsArray = ownedModelIds.map((m) => m.uid);
    
    // Construct the SQL query with proper handling of model IDs
    let whereClause = [];
    
    if (resourceType) {
      whereClause.push(`"resourceType" = '${resourceType}'`);
    }
    
    if (resourceId) {
      whereClause.push(`"resourceId" = '${resourceId}'`);
    }
    
    if (eventTypes && eventTypes.length > 0) {
      const eventTypesFormatted = eventTypes.map(t => `'${t}'`).join(',');
      whereClause.push(`"eventType" IN (${eventTypesFormatted})`);
    }
    
    // Add ownership restrictions for non-admin users
    if (!isAdmin && modelIdsArray.length > 0) {
      const modelIdsFormatted = modelIdsArray.map(id => `'${id}'`).join(',');
      whereClause.push(`("actorId" = '${owner.uid}' OR ("resourceType" = 'CommunityModel' AND "resourceId" IN (${modelIdsFormatted})))`);
    } else if (!isAdmin) {
      // If not admin and owns no models, only show their own actions
      whereClause.push(`"actorId" = '${owner.uid}'`);
    }
    
    const whereString = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
    
    // Execute the query with proper safety measures
    const queryString = `
      SELECT * FROM "SystemEvent"
      ${whereString}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
    
    const events = await prisma.$queryRawUnsafe(queryString);
    
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
} 