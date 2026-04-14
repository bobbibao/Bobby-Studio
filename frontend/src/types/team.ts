export enum MemberRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN'
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  owner: User;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
}

