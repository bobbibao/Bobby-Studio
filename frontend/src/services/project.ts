import apiService from '@/services/api/data-client';
import { UserAttributeEntity, UserAttributesDto } from '@/common/dtos/attribute/userAttribute.dto';
import { ActionEntity, ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { CreateProjectsDto } from '@/common/dtos/attribute/createProject.dto';

/**
 * Project calls backed by the API. Every request is authorized server-side against the signed-in user;
 * the user id in a path is only accepted when it matches the authenticated account.
 */
export const useProjectService = () => {
  const fetchUserProjects = async (
    userId: string,
  ): Promise<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> => apiService.get(`/projects/user/${userId}`);

  const upsertProjects = async (createProjectsDto: CreateProjectsDto): Promise<UserAttributesDto[]> =>
    apiService.post(`/projects`, { data: createProjectsDto });

  return { fetchUserProjects, upsertProjects };
};
