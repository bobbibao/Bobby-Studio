import { createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../services/api';
import { BobbyResponse } from '@/common/dtos/base.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import {
  OriginalImageAttributeEntity,
  GeneratedImageAttributeEntity,
  ActionEntity,
  ProjectAttributeEntity,
  VImage,
} from '@/common/dtos/attribute/common.dto';
import { GetUnassignedUserImagesAction, GetUserImagesAction, GetUserProjectAction } from '../features/admin/pages/admin/project/types/project';
import { updateLocalProjects } from '../reducers/project';
import { IProject, MoveImageToFolderAction } from '../features/admin/pages/admin/project/types/project';
import { AttributeTypeEnum } from '@/types/project';
import { Folder as AttributeFolder } from '@/common/dtos/attribute/common.dto';
import _ from 'lodash';

export const getUserProjects = createAsyncThunk(
  'projects/getUserProjects',
  async (GetUserProjectAction: GetUserProjectAction, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (GetUserProjectAction.orderBy) {
        params.append('orderBy', GetUserProjectAction.orderBy);
      }
      if (Array.isArray(GetUserProjectAction.inputType)) {
        GetUserProjectAction.inputType.forEach((type) => params.append('inputType', type));
      }
      if (GetUserProjectAction.creationType) {
        params.append('creationType', GetUserProjectAction.creationType);
      }
      const response = await apiService.get(`/projects/user/${GetUserProjectAction.userId}?${params.toString()}`);
      const result: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[] = response.data;
      return result;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your projects doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const getUnassignedAttributes = createAsyncThunk(
  'projects/getUnassignedAttributes',
  async (getUnassignedUserImagesAction: GetUnassignedUserImagesAction, { rejectWithValue }) => {
    try {
      const { userId, page, limit, orderBy, inputType, creationType, lastCreatedAt, lastId } = getUnassignedUserImagesAction;

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (orderBy) {
        params.append('orderBy', orderBy);
      }
      if (Array.isArray(inputType)) {
        inputType.forEach((type) => params.append('inputType', type));
      }
      if (creationType) {
        params.append('creationType', creationType);
      }
      if (lastCreatedAt) {
        params.append('lastCreatedAt', lastCreatedAt);
      }
      if (lastId) {
        params.append('lastId', lastId);
      }

      const response = await apiService.get(`/attributes/unassigned/${userId}?${params.toString()}`);
      const result: BobbyResponse<UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[]> =
        response.data;
      return result;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your attributes doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export interface GetUserUploadsAction {
  userId: string;
  page: number;
  limit: number;
  orderBy?: 'asc' | 'desc';
}

export const getUserUploads = createAsyncThunk(
  'projects/getUserUploads',
  async (getUserUploadsAction: GetUserUploadsAction, { rejectWithValue }) => {
    try {
      const { userId, page, limit, orderBy } = getUserUploadsAction;

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (orderBy) {
        params.append('orderBy', orderBy);
      }

      const response = await apiService.get(`/attributes/uploads/${userId}?${params.toString()}`);
      const result: BobbyResponse<UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[]> = response.data;
      return result;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your uploads doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const getAssignedAttributes = createAsyncThunk(
  'projects/getAssignedAttributes',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/attributes/assigned/${userId}`);
      return response.data;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your attributes doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const upsertUserProjects = createAsyncThunk(
  'projects/upsertUserProjects',
  async (projects: unknown, { rejectWithValue }) => {
    try {
      const response = await apiService.post(`/projects`, projects);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (status === 404) {
        errorMessage = "It looks like your attributes doesn't exist yet.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return rejectWithValue({
        message: errorMessage,
        status,
      });
    }
  }
);

export const deactivateAttribute = createAsyncThunk(
  'projects/deactivateAttribute',
  async (attributeId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/attributes/deactivate/${attributeId}`);
      return response.data;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your attributes doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// get images from user projects
export const getUserAssignedImages = createAsyncThunk(
  'projects/getUserImages',
  async (getUserImagesAction: GetUserImagesAction, { rejectWithValue }) => {
    try {
      const { userId, page, limit, images } = getUserImagesAction;
      const response = await apiService.post(`/attributes/assigned/${userId}?page=${page}&limit=${limit}`, {
        imageIds: images,
      });
      const result: BobbyResponse<UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[]> =
        response.data;
      return result.data;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your images doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteProject = createAsyncThunk('project/deleteProject', async (attributeId: string, { dispatch, getState }) => {
  const { projects, user } = getState() as any;
  const updateProj = projects.filter((p: { attributeId: string }) => p.attributeId !== attributeId);

  const action = await dispatch(upsertUserProjects(updateProj));
  if (user?.id) {
    dispatch(getUserProjects({ userId: user.id, orderBy: 'desc', inputType: [], creationType: '' }));
  }
  return action;
});

export const createFolder = createAsyncThunk(
  'project/createFolder',
  async ({ projectId, folderName }: { projectId: string; folderName: string }, { dispatch, getState }) => {
    const { projects, user } = getState() as any;
    const selectedProject = projects.find((project: IProject) => project.attributeId === projectId);

    if (selectedProject?.value) {
      const newFolder = {
        name: folderName,
        type: AttributeTypeEnum.FOLDER,
        images: [],
      };

      const updatedProject = {
        ...selectedProject,
        value: {
          ...selectedProject.value,
          folders: [...(selectedProject.value.folders || []), newFolder],
        },
      };

      await dispatch(
        upsertUserProjects({
          userId: user?.id,
          projects: projects.map((project: IProject) => (project.attributeId === projectId ? updatedProject : project)),
        })
      );

      dispatch(getUserProjects({ userId: user.id, orderBy: 'desc', inputType: [], creationType: '' }));
    }
  }
);

export const deleteFolder = createAsyncThunk(
  'project/deleteFolder',
  async ({ attributeId, folderIndex }: { attributeId: string; folderIndex: number }, { dispatch, getState }) => {
    const { projects } = getState() as any;
    const updateProj = _.cloneDeep(projects);

    updateProj.forEach((p : IProject) => {
      if (p.value && p.attributeId === attributeId && p.value.folders) {
        p.value.folders = p.value.folders.filter((folder: unknown, index: number) => index !== folderIndex);
      }
    });

    const transformedPayload = transformToUpdateProjectDTO(updateProj);
    const action = await dispatch(upsertUserProjects(transformedPayload));
    dispatch(updateLocalProjects(updateProj));

    return action;
  }
);

export const editFolder = createAsyncThunk(
  'project/editFolder',
  async (
    { attributeId, folderIndex, updatedFolder }: { attributeId: string; folderIndex: number; updatedFolder: { name: string } },
    { dispatch, getState }
  ) => {
    const { projectManagement } = getState() as { projectManagement: { projects: IProject[] } };
    const updateProj = _.cloneDeep(projectManagement.projects);

    updateProj.forEach((p: IProject) => {
      if (p.value && p.attributeId === attributeId && p.value.folders) {
        p.value.folders = p.value.folders.map((folder, index) =>
          index === folderIndex
            ? {
                ...folder,
                name: updatedFolder.name,
              }
            : folder
        );
      }
    });

    const transformedPayload = transformToUpdateProjectDTO(updateProj);
    const action = await dispatch(upsertUserProjects(transformedPayload));
    dispatch(updateLocalProjects(updateProj));

    return action;
  }
);

export const assignImageToFolder = createAsyncThunk(
  'project/assignImageToFolder',
  async ({ attributeId, folderName, image }: { attributeId: string; folderName: string; image: VImage }, { dispatch, getState }) => {
    const {
      projectManagement: { projects },
      currentUser: { user },
    } = (await getState()) as any;
    const updateProjects = projects.map((project: IProject) => {
      if (project.attributeId === attributeId && project.value?.folders) {
        const updatedFolders = project.value.folders.map((folder) => {
          if (folder.name === folderName) {
            return {
              ...folder,
              images: folder.images ? [...folder.images, image] : [image],
            };
          }
          return {
            ...folder,
            images: folder.images ? folder.images.filter((img) => img.id !== image.id) : [],
          };
        });

        return {
          ...project,
          value: {
            ...project.value,
            folders: updatedFolders,
          },
        };
      }
      return project;
    });

    dispatch(updateLocalProjects(updateProjects));
    await dispatch(
      upsertUserProjects({
        userId: user?.id,
        projects: updateProjects,
      })
    );
    return dispatch(getUserProjects({ userId: user?.id, orderBy: 'desc', inputType: [], creationType: '' }));
  }
);

export const assignImageToProject = createAsyncThunk(
  'project/assignImageToProject',
  async ({ attributeId, image }: { attributeId: string; image: VImage }, { dispatch, getState }) => {
    const {
      projectManagement: { projects },
      currentUser: { user },
    } = (await getState()) as any;
    const updateProjects = projects.map((project: IProject) => {
      if (project.attributeId === attributeId) {
        return {
          ...project,
          value: {
            ...project.value,
            images: project.value?.images ? [...project.value.images, image] : [image],
          },
        };
      }
      return project;
    });

    dispatch(updateLocalProjects(updateProjects));
    await dispatch(
      upsertUserProjects({
        userId: user?.id,
        projects: updateProjects,
      })
    );
    return dispatch(getUserProjects({ userId: user?.id, orderBy: 'desc', inputType: [], creationType: '' }));
  }
);

export const moveImage = createAsyncThunk('project/moveImage', async (payload: MoveImageToFolderAction, { dispatch, getState }) => {
  const { projects } = getState() as any;
  const updateProj = _.cloneDeep(projects);
  const imageId = payload.selectedImage.imageData.attributeId || payload.selectedImage.imageData.id;

  updateProj.forEach((project: IProject) => {
    // Handle moving to destination folder
    if (project.attributeId === payload.to.projectId && project.value?.folders) {
      const toFolder = project.value.folders[payload.to.folderIndex];
      if (toFolder) {
        // Check if image already exists to prevent duplicates
        const imageExists = toFolder.images.some((img: any) => {
          const existingId = img.id || img.attributeId;
          return existingId === imageId;
        });

        if (!imageExists) {
          toFolder.images = toFolder.images || [];
          toFolder.images.push(payload.selectedImage.imageData);
        }
      }
    }

    // Handle removing from source folder
    if (project.attributeId === payload.from.projectId && project.value?.folders) {
      const fromFolder = project.value.folders[payload.from.folderIndex];
      if (fromFolder) {
        fromFolder.images = (fromFolder.images || []).filter((img: any) => {
          const imgId = img.id || img.attributeId;
          return imgId !== imageId;
        });
      }
    }

    // Also remove from main project images if it exists there
    if (project.attributeId === payload.from.projectId && project.value?.images) {
      project.value.images = project.value.images.filter((img: any) => {
        const imgId = img.id || img.attributeId;
        return imgId !== imageId;
      });
    }
  });

  const transformedPayload = transformToUpdateProjectDTO(updateProj);
  const action = await dispatch(upsertUserProjects(transformedPayload));
  dispatch(updateLocalProjects(updateProj));

  return action;
});

export const deleteImage = createAsyncThunk(
  'project/deleteImage',
  async (
    { attributeId, folderName, imageId }: { attributeId: string; folderName: string; imageId: string },
    { dispatch, getState }
  ) => {
    const { projects } = getState() as any;
    const updateProj = _.cloneDeep(projects);

    updateProj.forEach((project: IProject) => {
      if (project.attributeId === attributeId && project.value?.folders) {
        project.value.folders = project.value.folders.map((folder) => {
          if (folder.name === folderName) {
            return {
              ...folder,
              images: folder.images.filter((img) => img.id !== imageId),
            };
          }
          return folder;
        });
      }
    });

    const transformedPayload = transformToUpdateProjectDTO(updateProj);
    const action = await dispatch(upsertUserProjects(transformedPayload));
    dispatch(updateLocalProjects(updateProj));

    return action;
  }
);

export const updateAssignedImage = createAsyncThunk(
  'project/updateAssignedImage',
  async (
    imageData:
      | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>
      | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[],
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      // Convert single item to array if needed

      const images = Array.isArray(imageData) ? imageData : [imageData];
      // Process all images in parallel

      const response = await apiService.put(`/attributes`, images);
      const result: BobbyResponse<UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>> =
        response.data;
      return result.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deactiveUnassignedImage = createAsyncThunk(
  'projects/deactiveUnassignedImage',
  async (attributeId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/attributes/deactivate/${attributeId}`);
      return response.data;
    } catch (error: any) {
      let errorMessage = 'An unexpected error has occurred. Our team has been notified';

      if (error.response && error.response && error.response.status == 404) {
        errorMessage = "It looks like your attributes doesn't exist yet.";
      }
      return rejectWithValue(errorMessage);
    }
  }
);

interface TransformedProject {
  userId: string;
  projects: {
    userId: string;
    attributeId: string | undefined;
    value: {
      type: string;
      title: string;
      folders: AttributeFolder[];
      description: string;
    };
    actions: Record<string, unknown>;
    createdAt: Date;
    type: string;
  }[];
}

const transformToUpdateProjectDTO = (
  userProjects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]
): TransformedProject => {
  return {
    userId: userProjects[0]?.userId || '',
    projects: userProjects.map((project) => ({
      userId: project.userId,
      attributeId: project.attributeId,
      value: {
        type: project.value?.type || '',
        title: project.value?.title || '',
        folders: (project.value?.folders as AttributeFolder[]) || [],
        description: project.value?.description || '',
      },
      actions: (typeof project.actions === 'string'
        ? JSON.parse(project.actions || '{}')
        : project.actions || {}) as Record<string, unknown>,
      createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
      type: project.type || project.value?.type || '',
    })),
  };
};

export const ProjectAPI = {
  getUserProject: async (userId: string, params: any): Promise<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> => {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch user projects');
      }

      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const response = await apiService.get(`/projects/user/${userId}?${searchParams}`);
      return response.data as UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
    } catch (error) {
      console.error('Fetch user projects error:', error);
      throw error;
    }
  },
};

