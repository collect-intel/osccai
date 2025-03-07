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