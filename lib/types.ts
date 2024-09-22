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

// Add other type definitions as needed