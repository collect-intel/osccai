# Event Logging System for CommunityModels

## Overview

This plan outlines a simplified yet robust implementation for tracking activities across the CommunityModels platform. The system focuses on providing essential audit trails while minimizing complexity for this MVP stage.

## Purpose

- Create accountability for changes across the platform
- Provide visibility into who performed what actions and when
- Enable troubleshooting of configuration and content issues
- Support administrative oversight of platform usage

## Event Types

The system will track these core event types:

```typescript
/**
 * Represents all possible system event types
 * Each type corresponds to a specific action in the system
 */
export enum EventType {
  /** Changes to any CommunityModel settings */
  MODEL_SETTING_CHANGE = "MODEL_SETTING_CHANGE",
  
  /** New statement added to a poll */
  STATEMENT_ADDED = "STATEMENT_ADDED",
  
  /** Vote cast on a statement */
  VOTE_CAST = "VOTE_CAST",
  
  /** GAC score updated for statement */
  GAC_SCORE_UPDATED = "GAC_SCORE_UPDATED",
  
  /** New poll created */
  POLL_CREATED = "POLL_CREATED",
  
  /** Poll settings updated */
  POLL_UPDATED = "POLL_UPDATED", 
  
  /** New constitution generated */
  CONSTITUTION_GENERATED = "CONSTITUTION_GENERATED",
  
  /** Constitution activated for a model */
  CONSTITUTION_ACTIVATED = "CONSTITUTION_ACTIVATED",
  
  /** New API key created */
  API_KEY_CREATED = "API_KEY_CREATED",
  
  /** API key revoked */
  API_KEY_REVOKED = "API_KEY_REVOKED",
}
```

## Implementation Plan

### 1. Database Schema

Add a `SystemEvent` model to the Prisma schema:

```prisma
/**
 * Represents a system event for audit logging purposes
 * Tracks changes and actions across the platform
 */
model SystemEvent {
  uid           String         @id @default(cuid())
  eventType     String         // Enum value representing the event type
  resourceType  String         // Type of resource affected (e.g., "CommunityModel")
  resourceId    String         // ID of the affected resource
  actorId       String         // UID of the user who performed the action
  actorName     String?        // Name of the user for readability
  isAdminAction Boolean        @default(false)
  metadata      Json?          // Flexible JSON payload for event-specific data
  createdAt     DateTime       @default(now())

  @@index([resourceType, resourceId])
  @@index([actorId])
  @@index([eventType])
  @@index([createdAt])
}
```

### 2. Type Definitions

Create a file `lib/types/events.ts` with strong typing:

```typescript
/**
 * Defines all possible system event types
 * Used for type-safe event logging
 */
export enum EventType {
  MODEL_SETTING_CHANGE = "MODEL_SETTING_CHANGE",
  STATEMENT_ADDED = "STATEMENT_ADDED",
  VOTE_CAST = "VOTE_CAST",
  GAC_SCORE_UPDATED = "GAC_SCORE_UPDATED",
  POLL_CREATED = "POLL_CREATED",
  POLL_UPDATED = "POLL_UPDATED",
  CONSTITUTION_GENERATED = "CONSTITUTION_GENERATED",
  CONSTITUTION_ACTIVATED = "CONSTITUTION_ACTIVATED",
  API_KEY_CREATED = "API_KEY_CREATED",
  API_KEY_REVOKED = "API_KEY_REVOKED",
}

/**
 * Defines resource types that can be affected by events
 */
export enum ResourceType {
  COMMUNITY_MODEL = "CommunityModel",
  STATEMENT = "Statement",
  POLL = "Poll",
  VOTE = "Vote",
  CONSTITUTION = "Constitution",
  API_KEY = "ApiKey",
}

/**
 * Represents a user or system actor performing an action
 */
export interface Actor {
  id: string;
  name?: string;
  isAdmin: boolean;
}

/**
 * Core parameters required for logging any system event
 */
export interface SystemEventParams {
  eventType: EventType;
  resourceType: ResourceType;
  resourceId: string;
  actor: Actor;
  metadata?: Record<string, any>;
}

/**
 * Metadata for model setting changes
 * Tracks old and new values for each changed field
 */
export interface ModelChangeMetadata {
  changes: Record<
    string,
    {
      old: any;
      new: any;
    }
  >;
}

/**
 * Metadata for new statement events
 */
export interface StatementAddedMetadata {
  pollId: string;
  text: string;
}

/**
 * Metadata for vote cast events
 */
export interface VoteCastMetadata {
  statementId: string;
  pollId: string;
  voteValue: string;
}

/**
 * Metadata for GAC score updates
 */
export interface GacScoreUpdatedMetadata {
  pollId: string;
  oldScore?: number;
  newScore: number;
}

/**
 * Metadata for poll-related events
 */
export interface PollMetadata {
  modelId: string;
  title: string;
}

/**
 * Metadata for constitution-related events
 */
export interface ConstitutionMetadata {
  modelId: string;
  version: number;
}

/**
 * Metadata for API key-related events
 */
export interface ApiKeyMetadata {
  modelId: string;
  keyName?: string;
}
```

### 3. Simple Event Logger

Create a file `lib/utils/eventLogger.ts` with direct logging:

```typescript
import {
  EventType,
  ResourceType,
  Actor,
  SystemEventParams,
  ModelChangeMetadata,
  StatementAddedMetadata,
  VoteCastMetadata,
  GacScoreUpdatedMetadata,
  PollMetadata,
  ConstitutionMetadata,
  ApiKeyMetadata
} from "../types/events";
import { prisma } from "../db";
import {
  CommunityModel,
  Statement,
  Poll,
  Constitution,
  ApiKey,
  Vote,
} from "@prisma/client";

/**
 * Logs a system event to the database
 * This is the core function that handles all event logging
 * 
 * @param params Event parameters including type, resource, actor and metadata
 */
export async function logSystemEvent(params: SystemEventParams): Promise<void> {
  try {
    await prisma.systemEvent.create({
      data: {
        eventType: params.eventType,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        actorId: params.actor.id,
        actorName: params.actor.name,
        isAdminAction: params.actor.isAdmin,
        metadata: params.metadata || {},
      },
    });
  } catch (error) {
    // Non-blocking: failure to log shouldn't break the application
    console.error("Failed to log event:", error);
  }
}

/**
 * Helper to create an Actor object from a CommunityModelOwner
 * @param owner The owner object containing uid, name and admin status
 */
export function createActorFromOwner(owner: {
  uid: string;
  name: string;
  isAdmin: boolean;
}): Actor {
  return {
    id: owner.uid,
    name: owner.name,
    isAdmin: owner.isAdmin || false,
  };
}

/**
 * System actor for automated processes
 * Used when events are generated by the system rather than a user
 */
export const SYSTEM_ACTOR: Actor = {
  id: "system",
  name: "Automated Process",
  isAdmin: true,
};

/**
 * Logs changes made to a community model's settings
 * Compares old and new versions to identify and log specific changes
 * 
 * @param oldModel Original model state
 * @param newModel Updated model state
 * @param actor The user who made the changes
 */
export function logModelChanges(
  oldModel: CommunityModel,
  newModel: CommunityModel,
  actor: Actor,
): void {
  const fieldsToTrack = [
    "name",
    "goal",
    "bio",
    "logoUrl",
    "requireAuth",
    "allowContributions",
    "published",
    "apiEnabled",
    "autoCreateConstitution",
    "advancedOptionsEnabled",
  ];

  const changes: Record<string, { old: any; new: any }> = {};
  let hasChanges = false;

  for (const field of fieldsToTrack) {
    if (oldModel[field] !== newModel[field]) {
      changes[field] = {
        old: oldModel[field],
        new: newModel[field],
      };
      hasChanges = true;
    }
  }

  if (!hasChanges) return;

  const metadata: ModelChangeMetadata = { changes };

  logSystemEvent({
    eventType: EventType.MODEL_SETTING_CHANGE,
    resourceType: ResourceType.COMMUNITY_MODEL,
    resourceId: newModel.uid,
    actor,
    metadata,
  });
}

/**
 * Logs when a new statement is added
 * 
 * @param statement The newly created statement
 * @param actor The user who added the statement
 */
export function logStatementAdded(statement: Statement, actor: Actor): void {
  const metadata: StatementAddedMetadata = {
    pollId: statement.pollId,
    text: statement.text,
  };

  logSystemEvent({
    eventType: EventType.STATEMENT_ADDED,
    resourceType: ResourceType.STATEMENT,
    resourceId: statement.uid,
    actor,
    metadata,
  });
}

/**
 * Logs when a vote is cast on a statement
 * 
 * @param vote The vote that was cast
 * @param pollId The ID of the poll containing the statement
 * @param actor The user who cast the vote
 */
export function logVoteCast(vote: Vote, pollId: string, actor: Actor): void {
  const metadata: VoteCastMetadata = {
    statementId: vote.statementId,
    pollId: pollId,
    voteValue: vote.voteValue,
  };

  logSystemEvent({
    eventType: EventType.VOTE_CAST,
    resourceType: ResourceType.VOTE,
    resourceId: vote.uid,
    actor,
    metadata,
  });
}

/**
 * Logs when a GAC score is updated
 * Typically called after vote calculations
 * 
 * @param statement The statement with the updated score
 * @param oldScore Previous GAC score value
 * @param newScore New GAC score value
 */
export function logGacScoreUpdated(
  statement: Statement,
  oldScore: number | undefined,
  newScore: number,
): void {
  const metadata: GacScoreUpdatedMetadata = {
    pollId: statement.pollId,
    oldScore,
    newScore,
  };

  logSystemEvent({
    eventType: EventType.GAC_SCORE_UPDATED,
    resourceType: ResourceType.STATEMENT,
    resourceId: statement.uid,
    actor: SYSTEM_ACTOR,
    metadata,
  });
}

/**
 * Logs when a new poll is created
 * 
 * @param poll The newly created poll
 * @param actor The user who created the poll
 */
export function logPollCreated(poll: Poll, actor: Actor): void {
  const metadata: PollMetadata = {
    modelId: poll.communityModelId,
    title: poll.title,
  };

  logSystemEvent({
    eventType: EventType.POLL_CREATED,
    resourceType: ResourceType.POLL,
    resourceId: poll.uid,
    actor,
    metadata,
  });
}

/**
 * Logs when a new constitution is generated
 * 
 * @param constitution The newly generated constitution
 * @param actor The user or system that generated it
 */
export function logConstitutionGenerated(
  constitution: Constitution,
  actor: Actor,
): void {
  const metadata: ConstitutionMetadata = {
    modelId: constitution.modelId,
    version: constitution.version,
  };

  logSystemEvent({
    eventType: EventType.CONSTITUTION_GENERATED,
    resourceType: ResourceType.CONSTITUTION,
    resourceId: constitution.uid,
    actor,
    metadata,
  });
}

/**
 * Logs when an API key is created
 * 
 * @param apiKey The newly created API key
 * @param actor The user who created the key
 */
export function logApiKeyCreated(apiKey: ApiKey, actor: Actor): void {
  const metadata: ApiKeyMetadata = {
    modelId: apiKey.modelId,
    keyName: apiKey.name || undefined,
  };

  logSystemEvent({
    eventType: EventType.API_KEY_CREATED,
    resourceType: ResourceType.API_KEY,
    resourceId: apiKey.uid,
    actor,
    metadata,
  });
}

/**
 * Additional helper functions can be added for other event types
 * following the same pattern
 */
```

### 4. Integration with Existing Functions

Here's an example of how to integrate the logger with the CommunityModel update function:

```typescript
import { createActorFromOwner, logModelChanges } from "./utils/eventLogger";

/**
 * Updates a CommunityModel and logs the changes
 * @param modelId ID of the model to update
 * @param data The new data to apply to the model
 */
export async function updateCommunityModel(
  modelId: string,
  data: Partial<CommunityModelUpdateData>,
) {
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) {
    throw new Error("User not authenticated");
  }

  // Get the current model state before update
  const currentModel = await prisma.communityModel.findUnique({
    where: { uid: modelId },
    include: { owner: true },
  });

  if (!currentModel) {
    throw new Error("Model not found");
  }

  // Check if user is owner or admin
  const owner = await getOrCreateOwnerFromClerkId(clerkUserId);
  const isAdmin = owner.isAdmin || false;
  const isOwner = currentModel.ownerId === owner.uid;

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized to update this model");
  }

  // Perform the update
  const updatedModel = await prisma.communityModel.update({
    where: { uid: modelId },
    data: {
      ...data,
    },
    include: { owner: true },
  });

  // Create actor and log the changes
  const actor = createActorFromOwner({
    uid: owner.uid,
    name: owner.name,
    isAdmin: !isOwner && isAdmin,
  });

  // Log the model changes
  logModelChanges(currentModel, updatedModel, actor);

  return updatedModel;
}
```

### 5. Simple Event Viewer Component

Create a simple `lib/components/EventLogViewer.tsx`:

```typescript
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { EventType, ResourceType } from "../types/events";

/**
 * Props for the EventLogViewer component
 */
interface EventLogViewerProps {
  /** Filter events by resource type */
  resourceType?: ResourceType;
  /** Filter events by specific resource ID */
  resourceId?: string;
  /** Filter events by event types */
  eventTypes?: EventType[];
  /** Maximum number of events to display */
  limit?: number;
}

/**
 * Component for displaying a log of system events
 * Can be filtered by resource type, ID, and event types
 */
export default function EventLogViewer({
  resourceType,
  resourceId,
  eventTypes,
  limit = 10
}: EventLogViewerProps) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        // Build the query URL with filters
        let url = `/api/events?limit=${limit}`;

        if (resourceType) url += `&resourceType=${resourceType}`;
        if (resourceId) url += `&resourceId=${resourceId}`;
        if (eventTypes && eventTypes.length > 0) {
          url += `&eventTypes=${eventTypes.join(',')}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [resourceType, resourceId, eventTypes, limit]);

  if (loading) {
    return <div className="p-4">Loading events...</div>;
  }

  if (events.length === 0) {
    return <div className="p-4 text-gray-500">No events recorded yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.uid}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatEventType(event.eventType)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatResourceType(event.resourceType)} {truncate(event.resourceId, 8)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.actorName || truncate(event.actorId, 8)}
                {event.isAdminAction && <span className="ml-1 text-xs text-red-500">(Admin)</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatEventDetails(event)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Helper function to truncate long strings
 */
function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

/**
 * Format event type for display
 */
function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format resource type for display
 */
function formatResourceType(resourceType: string): string {
  return resourceType
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * Format event details based on event type
 */
function formatEventDetails(event: any): React.ReactNode {
  if (!event.metadata) return null;

  switch (event.eventType) {
    case EventType.MODEL_SETTING_CHANGE:
      return (
        <div>
          {Object.entries(event.metadata.changes).map(([field, values]: [string, any]) => (
            <div key={field} className="mb-1">
              <span className="font-medium">{field}:</span>{' '}
              <span className="line-through text-red-500">{formatValue(values.old)}</span>{' '}
              <span className="text-green-500">→ {formatValue(values.new)}</span>
            </div>
          ))}
        </div>
      );

    case EventType.STATEMENT_ADDED:
      return <div>"{truncate(event.metadata.text, 50)}"</div>;

    case EventType.VOTE_CAST:
      return <div>Vote: <span className="font-medium">{event.metadata.voteValue}</span></div>;

    case EventType.GAC_SCORE_UPDATED:
      return (
        <div>
          Score: <span className="line-through">{event.metadata.oldScore?.toFixed(2) || 'None'}</span>{' '}
          → <span className="font-medium">{event.metadata.newScore.toFixed(2)}</span>
        </div>
      );

    default:
      return <pre className="text-xs">{JSON.stringify(event.metadata, null, 2)}</pre>;
  }
}

/**
 * Format different value types for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
```

### 6. Simple API Route

Create an API route at `app/api/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { EventType, ResourceType } from "@/lib/types/events";

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

  // Check if user is admin
  const isAdmin = owner.isAdmin || false;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const resourceType = searchParams.get("resourceType") as ResourceType | null;
  const resourceId = searchParams.get("resourceId");
  const eventTypesParam = searchParams.get("eventTypes");
  const eventTypes = eventTypesParam
    ? (eventTypesParam.split(",") as EventType[])
    : null;

  // Build the query
  const query: any = {};

  // If not admin, restrict to resources owned by the user
  if (!isAdmin) {
    // Find models owned by this user
    const ownedModelIds = await prisma.communityModel.findMany({
      where: { ownerId: owner.uid },
      select: { uid: true },
    });

    const modelIds = ownedModelIds.map((m) => m.uid);

    // User can see events for their own models or events they triggered
    query.OR = [
      { actorId: owner.uid },
      {
        AND: [
          { resourceType: "CommunityModel" },
          { resourceId: { in: modelIds } },
        ],
      },
      // Additional clauses can be added later as needed
    ];
  }

  // Add filters from query parameters
  if (resourceType) {
    query.resourceType = resourceType;
  }

  if (resourceId) {
    query.resourceId = resourceId;
  }

  if (eventTypes && eventTypes.length > 0) {
    query.eventType = { in: eventTypes };
  }

  // Fetch events
  const events = await prisma.systemEvent.findMany({
    where: query,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(events);
}
```

### 7. Integration Approach

1. **Phase 1: Basic Setup**
   - Add the SystemEvent model to Prisma schema and run migration
   - Implement the events.ts type definitions
   - Create the basic eventLogger.ts utility

2. **Phase 2: Core Event Integration**
   - Start with MODEL_SETTING_CHANGE in the updateCommunityModel function
   - Once verified, add other high-priority events (STATEMENT_ADDED, VOTE_CAST)

3. **Phase 3: UI and API**
   - Implement the API endpoint for event retrieval
   - Add the EventLogViewer component
   - Integrate the viewer into the model details page

4. **Phase 4: Extend Coverage**
   - Add logging to remaining functions
   - Implement specialized formatting for different event types

## Usage Examples

### 1. Logging a Model Change

```typescript
// Inside updateCommunityModel function
const actor = createActorFromOwner({
  uid: owner.uid,
  name: owner.name,
  isAdmin: isAdmin,
});

logModelChanges(currentModel, updatedModel, actor);
```

### 2. Displaying Events on Model Details Page

```tsx
// In the model details component
import EventLogViewer from "@/lib/components/EventLogViewer";
import { ResourceType } from "@/lib/types/events";

// ...

<div className="mt-8">
  <h3 className="text-lg font-medium leading-6 text-gray-900">Activity Log</h3>
  <div className="mt-2">
    <EventLogViewer
      resourceType={ResourceType.COMMUNITY_MODEL}
      resourceId={modelId}
      limit={10}
    />
  </div>
</div>
```

## Conclusion

This approach implements logging while ensuring that the core functionality:

- ✅ **Directly logs events** without EventEmitter complexity
- ✅ **Maintains strong typing** for all events and metadata
- ✅ **Provides comprehensive documentation** through comments
- ✅ **Enables progressive implementation** starting with critical events
- ✅ **Simplifies integration** with existing action functions

The system is designed to be easily maintainable and expandable as the application grows beyond the MVP stage.
