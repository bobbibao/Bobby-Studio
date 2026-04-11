import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AssignImageFromUnassignedToProjectFolderAction,
  AssignImageToProjectFolderAction,
  CreateFolderAction,
  CreateProjectAction,
  IProjectManagementState,
  IProject,
} from '../features/admin/pages/admin/project/types/project';
import {
  getAssignedAttributes,
  getUnassignedAttributes,
  getUserAssignedImages,
  getUserProjects,
  getUserUploads,
  upsertUserProjects,
  deleteProject,
  createFolder,
  deleteFolder,
  editFolder,
  assignImageToFolder,
  moveImage,
  deleteImage,
  updateAssignedImage,
} from '../actions/project';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import {
  ProjectAttributeEntity,
  ActionEntity,
  Folder,
  VImage,
  Project,
  OriginalImageAttributeEntity,
  GeneratedImageAttributeEntity,
} from '@/common/dtos/attribute/common.dto';
import { AttributeTypeEnum } from '@/constants/attribute-enum';
import { CreateProjectsDto } from '@/common/dtos/attribute/createProject.dto';

const initialState: IProjectManagementState = {
  loading: true,
  error: null,
  projects: [],
  unassignedAttributes: [],
  assignedAttributes: [],
  uploads: [],
  selectedProjectId: '',
  selectedFolderIndex: 0,
  selectedAssignedImage: null,
  selectedUnassignedImage: null,
  toast: {
    isOpen: false,
    title: '',
    description: '',
    status: 'info' as 'info' | 'success' | 'error' | 'warning',
  },
};

export const projectManagementSlice = createSlice({
  name: 'projectManagement',
  initialState,
  reducers: {
    updateLocalProjects: (state, action: PayloadAction<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]>) => {
      state.projects = action.payload;
    },
    deleteProject: (state, action) => {
      const { attributeId } = action.payload;

      // Actually update the state by filtering out the deleted project
      state.projects = state.projects.filter((project) => project.attributeId !== attributeId);
    },
    createFolder: (state, action: PayloadAction<CreateFolderAction>) => {
      const { selectedProjectId, folderName } = action.payload;
      const selectedProject = state.projects.find((project) => project.attributeId === selectedProjectId);
      const newProjects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[] = state.projects.filter(
        (project) => project.attributeId !== selectedProjectId
      );

      if (selectedProject && selectedProject.value) {
        const newFolder: Folder = {
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

        // [
        //     ...newProjects,
        //     updatedProject
        // ]

        // TODO upsert projects
        const userId = ''; // TODO
        const createProjectsDto: CreateProjectsDto = transformToCreateProjectDTO(userId, newProjects);
        // TODO reload user projects
      }
    },
    assignImageToProjectFolder: (state, action: PayloadAction<AssignImageToProjectFolderAction>) => {
      const { from, to, selectedImage } = action.payload;
      // remove from old project
      const newProjects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[] = state.projects.map((project) => {
        // Check if the current project matches the `projectId`
        if (project.value?.id !== from.projectId) {
          return project; // Return unchanged project if it doesn't match
        }

        const folders = project.value.folders?.map((folder, index) => {
          if (index !== from.folderIndex) {
            return folder; // Return unchanged folder if it doesn't match `folderIndex`
          }

          // Filter images in the folder
          const updatedImages = folder.images?.filter((image: VImage) => image.id !== selectedImage.id);

          // Return updated folder with filtered images
          return {
            ...folder,
            images: updatedImages,
          };
        });

        // Return updated project with updated folders
        return {
          ...project,
          value: {
            ...project.value,
            folders,
          },
        };
      });

      // append to new project
      newProjects.map((project) => {
        // Check if the project matches the specified `projectId`
        if (project.value?.id !== to.projectId) {
          return project; // Return the unchanged project
        }

        const updatedFolders = project.value.folders?.map((folder, index) => {
          // Check if the folder matches the specified `folderId`
          if (index !== to.folderIndex) {
            return folder; // Return the unchanged folder
          }

          // Append the new VImage to the folder's images array
          return {
            ...folder,
            images: [...folder.images, selectedImage], // Append the image immutably
          };
        });

        // Return the updated project with updated folders
        return {
          ...project,
          value: {
            ...project.value,
            folders: updatedFolders,
          },
        };
      });

      // TODO upsert newProjects
      const userId = ''; // TODO
      const createProjectsDto: CreateProjectsDto = transformToCreateProjectDTO(userId, newProjects);
      // TODO reload user projects
    },
    assignImageFromUnassignedToProjectFolderAction: (state, action: PayloadAction<AssignImageFromUnassignedToProjectFolderAction>) => {
      const { from, to, selectedImage } = action.payload;
      // append image to newProjects
      const newProjects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[] = state.projects.map((project) => {
        // Check if the project matches the specified `projectId`
        if (project.value?.id !== to.projectId) {
          return project; // Return the unchanged project
        }

        const updatedFolders = project.value.folders?.map((folder, index) => {
          // Check if the folder matches the specified `folderId`
          if (index !== to.folderIndex) {
            return folder; // Return the unchanged folder
          }

          // Append the new VImage to the folder's images array
          return {
            ...folder,
            images: [...folder.images, selectedImage], // Append the image immutably
          };
        });

        // Return the updated project with updated folders
        return {
          ...project,
          value: {
            ...project.value,
            folders: updatedFolders,
          },
        };
      });
      // TODO upsert newProjects
      const userId = ''; // TODO
      const createProjectsDto: CreateProjectsDto = transformToCreateProjectDTO(userId, newProjects);
      // TODO reload user projects
    },
    updateSelectedProjectId: (state, action) => {
      state.selectedProjectId = action.payload;
    },
    updateSelectedFolderIndex: (state, action) => {
      const { folderIndex } = action.payload;
      state.selectedFolderIndex = folderIndex;
    },
    updateSelectedAssignedImage: (state, action) => {
      const { assignedImage } = action.payload;
      state.selectedAssignedImage = assignedImage;
    },
    updateSelectedUnassignedImage: (state, action) => {
      const { unassignedImage } = action.payload;
      state.selectedProjectId = unassignedImage;
    },
    showToast: (
      state,
      action: PayloadAction<{
        title: string;
        description: string;
        status: 'info' | 'success' | 'error' | 'warning';
      }>
    ) => {
      state.toast = {
        isOpen: true,
        ...action.payload,
      };
    },
    hideToast: (state) => {
      state.toast.isOpen = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserProjects.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.length) {
          state.projects = action.payload;
        }
      })
      .addCase(getUserProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getUnassignedAttributes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUnassignedAttributes.fulfilled, (state, action) => {
        state.loading = false;
        state.unassignedAttributes = action.payload.data;
      })
      .addCase(getUnassignedAttributes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getAssignedAttributes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAssignedAttributes.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedAttributes = action.payload;
      })
      .addCase(getAssignedAttributes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getUserUploads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserUploads.fulfilled, (state, action) => {
        state.loading = false;
        state.uploads = action.payload.data;
      })
      .addCase(getUserUploads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(upsertUserProjects.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upsertUserProjects.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(upsertUserProjects.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        state.error = typeof payload === 'string' ? payload : payload?.message;
      })
      .addCase(getUserAssignedImages.pending, (state, action) => {
        state.loading = true;
        // state.error = action.payload as string;
      })
      .addCase(getUserAssignedImages.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedAttributes = action.payload;
      })
      .addCase(getUserAssignedImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Project
      .addCase(deleteProject.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Project',
          description: 'Project deleted successfully.',
          status: 'success',
        };
      })
      .addCase(deleteProject.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Project',
          description: 'Something wrong when deleting project.',
          status: 'error',
        };
      })

      // Create Folder
      .addCase(createFolder.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Folder created successfully.',
          status: 'success',
        };
      })
      .addCase(createFolder.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Failed to create folder.',
          status: 'error',
        };
      })

      // Delete Folder
      .addCase(deleteFolder.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Folder deleted successfully.',
          status: 'success',
        };
      })
      .addCase(deleteFolder.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Something wrong when deleting folder.',
          status: 'error',
        };
      })

      // Edit Folder
      .addCase(editFolder.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Folder updated successfully.',
          status: 'success',
        };
      })
      .addCase(editFolder.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Folder',
          description: 'Something went wrong when updating the folder.',
          status: 'error',
        };
      })

      // Assign Image to Folder
      .addCase(assignImageToFolder.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Image assigned successfully.',
          status: 'success',
        };
      })
      .addCase(assignImageToFolder.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Failed to assign image.',
          status: 'error',
        };
      })

      // Move Image
      .addCase(moveImage.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Image moved successfully.',
          status: 'success',
        };
      })
      .addCase(moveImage.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Failed to move image.',
          status: 'error',
        };
      })

      // Delete Image
      .addCase(deleteImage.fulfilled, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Image deleted successfully.',
          status: 'success',
        };
      })
      .addCase(deleteImage.rejected, (state) => {
        state.toast = {
          isOpen: true,
          title: 'Image',
          description: 'Something wrong when deleting Image.',
          status: 'error',
        };
      })
      // Update Assigned Image
      .addCase(
        updateAssignedImage.pending,
        (
          state: IProjectManagementState,
          action: PayloadAction<
            undefined,
            string,
            {
              arg:
                | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>
                | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[];
              requestId: string;
              requestStatus: 'pending';
            }
          >
        ) => {
          state.loading = true;
          state.error = null;
          state.previousAssignedAttributes = [...state.assignedAttributes];

          // Update immediately for optimistic UI
          const arg = action.meta.arg;
          const items = Array.isArray(arg) ? arg : [arg];
          state.assignedAttributes = state.assignedAttributes.map((attr) => {
            const replacement = items.find((item) => item.attributeId === attr.attributeId);
            return replacement ? replacement : attr;
          });
        }
      )
      .addCase(updateAssignedImage.fulfilled, (state: IProjectManagementState, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = null;
        delete state.previousAssignedAttributes;
      })
      .addCase(updateAssignedImage.rejected, (state: IProjectManagementState, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload as string;
        // Revert to previous state if available
        if (state.previousAssignedAttributes) {
          state.assignedAttributes = state.previousAssignedAttributes;
        }
        delete state.previousAssignedAttributes; // Clean up stored state
        state.toast = {
          isOpen: true,
          title: 'Error',
          description: action.payload as string,
          status: 'error',
        };
      })

      // Optional: Add pending states if you want to show loading states
      .addMatcher(
        (action) => action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected'),
        (state) => {
          state.loading = false;
        }
      );
  },
});

const transformToCreateProjectDTO = (userId: string, userProjects: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]) => {
  // const userId = localStorage.getItem('userId') || ''
  const ps: ProjectAttributeEntity[] = userProjects.map((uP) => uP.value).filter((uP) => !!uP);
  const pr: Project[] = ps.map((p) => ({
    id: p.id,
    title: p.title,
    type: AttributeTypeEnum.PROJECT,
    description: p.description,
    folders: p.folders,
  }));
  const createProjectsDto: CreateProjectsDto = {
    userId,
    projects: pr,
  };
  return createProjectsDto;
};

const { actions, reducer } = projectManagementSlice;
export const projectManagement = projectManagementSlice.reducer;
export const { updateLocalProjects, showToast, hideToast, updateSelectedProjectId } = actions;

