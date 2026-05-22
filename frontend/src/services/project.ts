import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import apiService from '@/services/api/data-client';
import { MOCK_FOLDER_LIST_BY_PROJECT } from '../configs/mock';
import { setLoading } from '../slices/loading';
import {
  CreateProjectRequest,
  FolderListResponse,
  ProjectResponse,
} from '../types/project';
import { UserAttributeEntity, UserAttributesDto } from '@/common/dtos/attribute/userAttribute.dto';
import { GeneratedImageAttributeEntity, OriginalImageAttributeEntity, ProjectAttributeEntity, ActionEntity } from '@/common/dtos/attribute/common.dto';
import { CreateProjectsDto } from '@/common/dtos/attribute/createProject.dto';
import { RootState } from '@/store';

export const useProjectService = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.currentUser.user?.id);  

  const fetchProjectAndFolder = async (): Promise<ProjectResponse[]> => {
    dispatch(setLoading(true));

    const processResponse = (response: any[]) => {

        return response.map((project: any) => {
          return {
            ...project,
            id: uuidv4(),
            folders:
              project?.folders?.map((folder: any) => {
                return {
                  ...folder,
                  id: uuidv4(),
                };
              }) || [],
          };
        })
        .flat();
    };

    try {
      const response: ProjectResponse[] = await apiService.get(
        `/projects/user/${userId}`
      );

      return processResponse(response);
    } catch (error) {
      console.error('Fetch user projects error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchProjectUnassigned = async (userId: string): Promise<
  UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]
  > => {
    dispatch(setLoading(true));
    try {
      const response: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[] = await apiService.get(
        `/attributes/unassigned/${userId}`
      );
      return response;
    } catch (error) {
      console.error('Fetch user projects error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchFolderListOfProject = async (
    project: string
  ): Promise<FolderListResponse[]> => {
    dispatch(setLoading(true));
    try {
      return new Promise((resolve) => {
        const fakeResponse = MOCK_FOLDER_LIST_BY_PROJECT;

        setTimeout(() => {
          resolve(fakeResponse);

          dispatch(setLoading(false));
        }, 500);
      });
    } catch (error) {
      console.error('Failed to fetch :', error);
      throw error;
    }
  };

  const createProject = async (
    params: CreateProjectRequest[]
  ): Promise<any> => {
    dispatch(setLoading(true));

    const request = {
      userId,
      projects: params,
    };
    try {
      const response: any = await apiService.post('/projects', request);

      return response;
    } catch (error) {
      console.error('Create project failed:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const editProject = async (params: CreateProjectRequest): Promise<any> => {
    dispatch(setLoading(true));

    try {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);

          dispatch(setLoading(false));
        }, 500);
      });
    } catch (error) {
      console.error('Failed to fetch :', error);
      throw error;
    }
  };

  const deleteProject = async (params: CreateProjectRequest): Promise<any> => {
    dispatch(setLoading(true));

    try {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);

          dispatch(setLoading(false));
        }, 500);
      });
    } catch (error) {
      console.error('Failed to fetch :', error);
      throw error;
    }
  };

  const assignProjectToFolder = async (
    params: CreateProjectRequest[]
  ): Promise<any> => {
    dispatch(setLoading(true));

    try {
      const request = {
        userId,
        projects: params,
      };
      const response: any = await apiService.post('/projects', request);

      return response;
    } catch (error) {
      console.error('Update project failed:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchUserProjects = async (userId: string): Promise< UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> => apiService.get(
    `/projects/user/${userId}`
  );

  const fetchAssignedImages = async (userId: string, imageIds: string[]): Promise< UserAttributeEntity<OriginalImageAttributeEntity| GeneratedImageAttributeEntity, ActionEntity>[]> => apiService.post(
    `/attributes/assigned/${userId}`, {
      imageIds
    }
  ); 

  const fetchUnassignedImages = async (userId: string): Promise< UserAttributeEntity<OriginalImageAttributeEntity| GeneratedImageAttributeEntity, ActionEntity>[]> => apiService.get(
    `/attributes/unassigned/${userId}`
  ); 

  const upsertProjects = async (createProjectsDto: CreateProjectsDto): Promise<UserAttributesDto[]> => apiService.post(
    `/projects`,{
      data: createProjectsDto
    }
  ); 

  return {
    fetchProjectAndFolder,
    fetchProjectUnassigned,
    fetchFolderListOfProject,
    createProject,
    editProject,
    deleteProject,
    assignProjectToFolder,
    fetchUserProjects,
    fetchAssignedImages,
    fetchUnassignedImages,
    upsertProjects
  };
};

