import type {
  Prisma,
  CommunityModel,
  Statement,
  Vote,
  Poll,
} from "@prisma/client";

export interface ExtendedCommunityModel extends CommunityModel {
  uid: string;
  name: string;
  bio: string | null;
  goal: string | null;
  logoUrl: string | null;
  published: boolean;
  apiEnabled: boolean;
  advancedOptionsEnabled: boolean;
  autoCreateConstitution: boolean;
  owner: {
    uid: string;
    name: string;
    clerkUserId: string;
  };
}

export interface ExtendedStatement extends Statement {
  votes: Vote[];
  flags: { uid: string }[];
}

export interface ExtendedPoll extends Omit<Poll, "statements"> {
  statements: ExtendedStatement[];
  communityModel: ExtendedCommunityModel;
  minVotesBeforeSubmission: number | null;
  maxVotesPerParticipant: number | null;
  maxSubmissionsPerParticipant: number | null;
  minRequiredSubmissions: number | null;
  completionMessage: string | null;
}

import React from "react";

export class ChatInterfaceConstitutionData {
  title: string;
  icon: React.ReactNode;
  constitution: string;
  color: string;
  text: string;

  constructor(
    title: string,
    icon: React.ReactNode,
    constitution: string,
    color: string,
    text: string,
  ) {
    this.title = title;
    this.icon = icon;
    this.constitution = constitution;
    this.color = color;
    this.text = text;
  }
}

export class ChatInterfaceKnowledgeData {
  title: string;
  icon: React.ReactNode;
  description: string;
  knowledge: string;

  constructor(
    title: string,
    icon: React.ReactNode,
    description: string,
    knowledge: string,
  ) {
    this.title = title;
    this.icon = icon;
    this.description = description;
    this.knowledge = knowledge;
  }
}

export interface XMLLMPromptFn {
  (options: {
    messages: { role: string; content: string }[];
    schema: { [key: string]: any };
    system: string;
  }): any;
}

export interface XMLLMRequestFn {
  (options: {
    system: string;
    messages: { role: string; content: string }[];
  }): any;
}

export interface ClerkUser {
  id: string;
  passwordEnabled: boolean;
  totpEnabled: boolean;
  backupCodeEnabled: boolean;
  twoFactorEnabled: boolean;
  banned: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  imageUrl: string;
  hasImage: boolean;
  primaryEmailAddressId: string | null;
  primaryPhoneNumberId: string | null;
  primaryWeb3WalletId: string | null;
  lastSignInAt: number;
  externalId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: Record<string, any>;
  privateMetadata: Record<string, any>;
  unsafeMetadata: Record<string, any>;
  emailAddresses: ClerkEmailAddress[];
  phoneNumbers: any[];
  web3Wallets: any[];
  externalAccounts: any[];
  samlAccounts: any[];
  lastActiveAt: number;
  createOrganizationEnabled: boolean;
  createOrganizationsLimit: number | null;
  deleteSelfEnabled: boolean;
}

export interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
  verification: any[];
  linkedTo: any[];
}

export interface MessageWithFields {
  role: "user" | "assistant";
  content: string;
  final_response?: string;
  draft_response?: string;
  response_metrics?: string;
  improvement_strategy?: string;
  isStreaming?: boolean;
  isNewMessage?: boolean;
  isInitialMessage?: boolean;
}

/**
 * Type for community models returned by the library page query.
 * We use Prisma.CommunityModelGetPayload instead of the base CommunityModel type because:
 * 1. The base CommunityModel type doesn't include relations by default
 * 2. This type exactly matches our specific SELECT query structure
 * 3. It automatically updates if we change the Prisma schema or query
 *
 * This is particularly important when dealing with relations like 'constitutions',
 * which need to be explicitly selected and typed according to what we're actually querying.
 */
export type PublishedModel = Prisma.CommunityModelGetPayload<{
  select: {
    uid: true;
    name: true;
    bio: true;
    constitutions: {
      select: {
        version: true;
      };
    };
  };
}>;
