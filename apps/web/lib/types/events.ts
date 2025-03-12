/**
 * Defines all possible system event types
 * Used for type-safe event logging
 */
export enum EventType {
  MODEL_SETTING_CHANGE = "MODEL_SETTING_CHANGE",
  STATEMENT_ADDED = "STATEMENT_ADDED",
  VOTE_CAST = "VOTE_CAST",

  // GAC_SCORE_UPDATED events are created both by the web app and directly
  // by the consensus-service Python script for efficiency
  GAC_SCORE_UPDATED = "GAC_SCORE_UPDATED",

  POLL_CREATED = "POLL_CREATED",
  POLL_UPDATED = "POLL_UPDATED",
  CONSTITUTION_GENERATED = "CONSTITUTION_GENERATED",
  CONSTITUTION_ACTIVATED = "CONSTITUTION_ACTIVATED",
  API_KEY_CREATED = "API_KEY_CREATED",
  API_KEY_REVOKED = "API_KEY_REVOKED",
}

/**
 * Defines how an event should be displayed in the UI
 */
export interface EventDisplayInfo {
  /** Brief description of what changed */
  label: string;
  /** The key path to the most important value to display */
  valuePath?: string;
  /** Format to apply to the value (e.g., 'text', 'score', 'boolean') */
  valueFormat?: "text" | "score" | "boolean" | "version" | "compare";
  /** Maximum length for text values before truncation */
  maxLength?: number;
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
  communityModelId?: string;
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
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for new statement events
 */
export interface StatementAddedMetadata {
  pollId: string;
  text: string;
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for vote cast events
 */
export interface VoteCastMetadata {
  statementId: string;
  pollId: string;
  voteValue: string;
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for GAC score updates
 */
export interface GacScoreUpdatedMetadata {
  pollId: string;
  oldScore?: number;
  newScore: number;
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for poll-related events
 */
export interface PollMetadata {
  modelId: string;
  title: string;
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for constitution-related events
 */
export interface ConstitutionMetadata {
  modelId: string;
  version: number;
  displayInfo?: EventDisplayInfo;
}

/**
 * Metadata for API key-related events
 */
export interface ApiKeyMetadata {
  modelId: string;
  keyName?: string;
  displayInfo?: EventDisplayInfo;
}

/**
 * Default display configurations for different event types
 * Used to standardize how events are presented in the UI
 */
export const EVENT_DISPLAY_CONFIG: Record<EventType, EventDisplayInfo> = {
  [EventType.MODEL_SETTING_CHANGE]: {
    label: "Setting changes",
    valueFormat: "compare",
  },
  [EventType.STATEMENT_ADDED]: {
    label: "Statement",
    valuePath: "text",
    valueFormat: "text",
    maxLength: 60,
  },
  [EventType.VOTE_CAST]: {
    label: "Vote",
    valuePath: "voteValue",
    valueFormat: "text",
  },
  [EventType.GAC_SCORE_UPDATED]: {
    label: "New Score",
    valuePath: "newScore",
    valueFormat: "score",
  },
  [EventType.POLL_CREATED]: {
    label: "New Poll",
    valuePath: "title",
    valueFormat: "text",
    maxLength: 40,
  },
  [EventType.POLL_UPDATED]: {
    label: "Poll Updated",
    valuePath: "title",
    valueFormat: "text",
    maxLength: 40,
  },
  [EventType.CONSTITUTION_GENERATED]: {
    label: "Constitution",
    valuePath: "version",
    valueFormat: "version",
  },
  [EventType.CONSTITUTION_ACTIVATED]: {
    label: "Constitution Activated",
    valuePath: "version",
    valueFormat: "version",
  },
  [EventType.API_KEY_CREATED]: {
    label: "API Key",
    valuePath: "keyName",
    valueFormat: "text",
  },
  [EventType.API_KEY_REVOKED]: {
    label: "API Key Revoked",
    valuePath: "keyName",
    valueFormat: "text",
  },
};
