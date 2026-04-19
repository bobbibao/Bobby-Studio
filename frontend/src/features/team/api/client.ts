import { apiClient } from '@/services/api/client';
import { MemberRole } from '@/types/team';

export interface CreateTeamDto {
  name: string;
}

export interface AddTeamMemberDto {
  userId: string;
  role: MemberRole;
}

export interface JoinTeamResponse {
  message: string;
}

export const createTeamIfNotExist = async (data: CreateTeamDto) => {
  const response = await apiClient.post('/teams', data);
  return response.data;
};

export const getMyTeams = async (userType?: string, page = 1, pageSize = 10) => {
  const params = new URLSearchParams();
  if (userType) params.append('userType', userType);
  params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());
  const response = await apiClient.get(`/teams/my-teams?${params.toString()}`);
  return response.data;
};

export const getTeamById = async (teamId: string) => {
  const response = await apiClient.get(`/teams/${teamId}`);
  return response.data;
};

export const getTeamMembers = async (teamId: string) => {
  const response = await apiClient.get(`/teams/${teamId}/members`);
  return response.data;
};

export const addTeamMember = async (teamId: string, data: AddTeamMemberDto) => {
  const response = await apiClient.post(`/teams/${teamId}/members`, data);
  return response.data;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
  const response = await apiClient.delete(`/teams/${teamId}/members/${userId}`);
  return response.data;
};

export const generateInviteLink = async () => {
  const response = await apiClient.post<{ inviteLink: string }>('/teams/generate-invite-link', []);
  const resp = response.data;
  if (!resp?.inviteLink) {
    return null;
  }
  return `${window.location.origin}/${resp.inviteLink}`;
};

export const joinTeamViaInviteLink = async (token: string): Promise<JoinTeamResponse> => {
  const response = await apiClient.post<JoinTeamResponse>(`/teams/invite/${token}/join`, []);
  return response.data;
};

