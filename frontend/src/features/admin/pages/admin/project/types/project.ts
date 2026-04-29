import {
  ActionEntity,
  GeneratedImageAttributeEntity,
  OriginalImageAttributeEntity,
  ProjectAttributeEntity,
} from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { VImage } from '@/common/dtos/attribute/common.dto';

export interface IProjectManagementState {
  loading: boolean;
  error: string | null;
  projects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  unassignedAttributes: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[];
  assignedAttributes: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[];
  uploads: UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[];
  selectedProjectId: string;
  selectedFolderIndex: number;
  selectedAssignedImage: (OriginalImageAttributeEntity | GeneratedImageAttributeEntity) | null;
  selectedUnassignedImage: (OriginalImageAttributeEntity | GeneratedImageAttributeEntity) | null;
  toast: {
    isOpen: boolean;
    title: string;
    description: string;
    status: 'info' | 'success' | 'error' | 'warning';
  };
  previousAssignedAttributes?: any[];
}

export interface CreateProjectAction {
  projectName: string;
  description: string;
}

export interface CreateFolderAction {
  selectedProjectId: string;
  folderName: string;
}

export interface AssignImageToProjectFolderAction {
  from: {
    projectId: string;
    folderIndex: number;
  };
  to: {
    projectId: string;
    folderIndex: number;
  };
  selectedImage: VImage;
}

export interface AssignImageFromUnassignedToProjectFolderAction {
  from: {
    imageIndex: number;
  };
  to: {
    projectId: string;
    folderIndex: number;
  };
  selectedImage: VImage;
}

export interface GetUserImagesAction {
  userId: string;
  images: string[];
  page: number;
  limit: number;
}

export interface GetUserUnassignedImagesAction {
  userId: string;
  page: number;
  limit: number;
}

export interface GetUnassignedUserImagesAction {
  userId: string;
  page: number;
  limit: number;
  orderBy?: 'asc' | 'desc';
  inputType?: string[];
  creationType?: string;
  lastCreatedAt?: string;
  lastId?: string;
}

export interface GetUserProjectAction {
  userId: string;
  orderBy?: 'asc' | 'desc';
  inputType?: string[];
  creationType?: string;
}

export interface SelectedMovingImageState {
  projectId: string;
  folderName: string;
  folderIndex: number;
  imageIndex: number;
  imageId: string;
  imagePath: string;
  imageData: any;
}
export interface MoveImageToFolderAction {
  from: {
    folderName: string;
    projectId: string;
    folderIndex: number;
  };
  to: {
    folderName: string;
    projectId: string;
    folderIndex: number;
  };
  selectedImage: SelectedMovingImageState;
}

export interface MoveImagesToFolderAction {
  from: {
    folderName: string;
    projectId: string;
    folderIndex: number;
  };
  to: {
    folderName: string;
    projectId: string;
    folderIndex: number;
  };
  selectedImages: SelectedMovingImageState[];
}

export type IProject = UserAttributeEntity<ProjectAttributeEntity, ActionEntity>;



