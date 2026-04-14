import { ImageData } from './index';

export enum AttributeTypeEnum {
  ORIGINAL_IMAGE = 'Original_Image',
  GENERATED_IMAGE = 'Generated_Image',
  PROJECT = 'Project',
  FOLDER = 'Folder',
}

export interface Folder {
  id?: string;
  name: string;
  type: string;
  attributeIds: ImageData[];
}

export interface ProjectFoldersTree {
  id: number;
  name: string;
  folders: {
    name: string;
    data: { id: number; path: string }[];
  }[];
}

export interface ProjectResponse {
  id?: string;
  type: string;
  title: string;
  description: string;
  folders: Folder[];
}

export interface Attribute {
  id: string;
  path: string;
}

export interface ProjectFilters {
  name?: string;
  date?: string;
  mode?: string[];
  models?: string[];
  type?: string;
  sort?: string;
}

export interface IProjectItem {
  id?: string,
  name: string;
  description?: string;
  path?: string;
  type?: string;
  updatedAt?: string;
}

export interface IFolderItem {
  id: number;
  name: string;
  updatedAt?: number;
}

export interface UnassignedProjectListResponse {
  id: number;
  path: string;
}

export interface FolderListResponse extends IFolderItem {
  test?: string;
}

export interface CreateProjectRequest {
  id?: string;
  title: string;
  description: string;
  type: AttributeTypeEnum;
  folders?: Folder;
}

export interface CreateFolderRequest {
  name: string;
}

export interface AssignProjectToFolderRequest extends ProjectFoldersTree {
  test?: string;
}

