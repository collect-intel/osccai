export interface CommunityModel {
  uid: string;
  name: string;
  initialIdea: string;
  ownerId: string;
  activeConstitutionId: string | null;
  // Add other necessary fields
}

export interface Constitution {
  uid: string;
  version: number;
  // Add other necessary fields
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
