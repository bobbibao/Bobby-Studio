import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import {
  getUnassignedAttributes,
  getUserProjects,
  upsertUserProjects,
  deactivateAttribute,
  deactiveUnassignedImage,
} from '../actions/project';
import { useToast } from '@chakra-ui/react';
import _ from 'lodash';
import { updateLocalProjects } from '../reducers/project';
import { Folder, ProjectAttributeEntity, ActionEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { AttributeTypeEnum } from '@/types/project';
import { IProject, MoveImagesToFolderAction, MoveImageToFolderAction } from '../features/admin/pages/admin/project/types/project';
import { useTranslation } from 'react-i18next';
import { method } from 'lodash';

export const UserProjectManagement = () => {
  const { t } = useTranslation();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const { loading, error, projects, unassignedAttributes, assignedAttributes, uploads } = useAppSelector(
    (state) => state.projectManagement
  );
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.currentUser);

  const deleteProject = useCallback(
    async (attributeId: string) => {
      // Optimistically remove from local state first
      const updatedProjects = projects.filter((project) => project.attributeId !== attributeId);
      dispatch(updateLocalProjects(updatedProjects));

      const action = await dispatch(deactivateAttribute(attributeId));
      if (deactivateAttribute.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('project_deleted_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        // Revert optimistic update on failure
        dispatch(updateLocalProjects(projects));
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('something_wrong_when_deleting_project'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }

      // Refresh data from server
      if (user?.id) {
        dispatch(getUserProjects({ userId: userId, orderBy: 'desc', inputType: [], creationType: '' }));
      }
    },
    [dispatch, projects, toast, user]
  );

  const createFolder = useCallback(
    async (projectId: string, folderName: string) => {
      const selectedProject = projects.find((project) => project.attributeId === projectId);
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

        await dispatch(
          upsertUserProjects({
            userId: user?.id,
            projects: projects.map((project) => (project.attributeId === projectId ? updatedProject : project)),
          })
        );

        dispatch(getUserProjects({ userId: user?.id as string, orderBy: 'desc', inputType: [], creationType: '' }));
      }
    },
    [projects, user]
  );

  const createProject = useCallback(
    async (projectName: string, projectDescription: string) => {
      const projectValue: ProjectAttributeEntity = {
        title: projectName,
        type: AttributeTypeEnum.PROJECT,
        description: projectDescription,
      };

      const newPro = {
        userId: user?.id,
        projects: [
          ...projects,
          {
            userId: user?.id,
            value: {
              ...projectValue,
              folders: [],
            },
          },
        ],
      };

      const action = await dispatch(upsertUserProjects(newPro));
      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('project_created_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('something_wrong_when_creating_project'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }

      if (user?.id) {
        dispatch(getUserProjects({ userId: user?.id as string, orderBy: 'desc', inputType: [], creationType: '' }));
      }
    },
    [projects, user, dispatch, toast, translatorNotificationNS]
  );

  const deleteFolder = useCallback(
    async (attributeId: string, folderIndex: number) => {
      const updateProj = _.cloneDeep(projects);
      updateProj.forEach((p) => {
        if (p.value && p.attributeId === attributeId && p.value.folders) {
          p.value.folders = p.value.folders.filter((folder: unknown, index: number) => index !== folderIndex);
        }
      });

      const transformedPayload = transformToUpdateProjectDTO(updateProj);
      const action = await dispatch(upsertUserProjects(transformedPayload));
      dispatch(updateLocalProjects(updateProj));
      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('folder'),
          description: translatorNotificationNS('folder_deleted_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('folder'),
          description: translatorNotificationNS('something_wrong_when_deleting_folder'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
      dispatch(getUserProjects({ userId: user?.id as string, orderBy: 'desc', inputType: [], creationType: '' }));
    },
    [dispatch, projects, toast, user]
  );

  const editFolder = useCallback(
    async (attributeId: string, folderIndex: number, updatedFolder: { name: string }) => {
      const updateProj = _.cloneDeep(projects);

      updateProj.forEach((p) => {
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
      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('folder'),
          description: translatorNotificationNS('folder_updated_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('folder'),
          description: translatorNotificationNS('something_went_wrong_when_updating_the_folder'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
      dispatch(getUserProjects({ userId: user?.id as string, orderBy: 'desc', inputType: [], creationType: '' }));
    },
    [dispatch, projects, toast, user]
  );

  const editProjectTitleAndDescription = useCallback(
    async (attributeId: string, title: string, description: string) => {
      const updateProj = _.cloneDeep(projects);

      updateProj.forEach((p) => {
        if (p.value && p.attributeId === attributeId) {
          p.value.title = title;
          p.value.description = description;
        }
      });

      const transformedPayload = transformToUpdateProjectDTO(updateProj);
      const action = await dispatch(upsertUserProjects(transformedPayload));
      dispatch(updateLocalProjects(updateProj));

      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('project_details_updated_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('project'),
          description: translatorNotificationNS('something_went_wrong_when_updating_the_project'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }

      dispatch(getUserProjects({ userId: user?.id as string, orderBy: 'desc', inputType: [], creationType: '' }));
    },
    [dispatch, projects, toast, user]
  );

  const assignImageToFolder = useCallback(
    async (attributeId: string, folderName: string, image: { id: string; path: string }) => {
      const updateProjects = projects.map((project: IProject) => {
        if (project.attributeId === attributeId && project.value && project.value.folders) {
          const updatedFolders = project.value.folders.map((folder: Folder) => {
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
      dispatch(getUserProjects({ userId: userId, orderBy: 'desc', inputType: [], creationType: '' }));
    },
    [dispatch, projects, user]
  );

  const deleteImage = useCallback(
    async (attributeId: string, folderName: string, imageId: string) => {
      const updateProj = _.cloneDeep(projects);
      updateProj.forEach((project: IProject) => {
        if (project.attributeId === attributeId && project.value) {
          // Check and remove from folder images if folders exist
          if (project.value.folders) {
            project.value.folders = project.value.folders.map((folder: Folder) => {
              if (folder.name === folderName) {
                return {
                  ...folder,
                  images: folder.images.filter((img: any) => {
                    if (img.id) return img.id !== imageId;
                    else if (img.attributeId) return img.attributeId !== imageId;
                    return img;
                  }),
                };
              }
              return folder;
            });
          }

          // Also check and remove from main project images
          if (project.value.images) {
            project.value.images = project.value.images.filter((img: any) => {
              if (img.id) return img.id !== imageId;
              else if (img.attributeId) return img.attributeId !== imageId;
              return img;
            });
          }
        }
      });
      // const transformedPayload = transformToUpdateProjectDTO(updateProj);
      const transformedPayload = {
        userId: user?.id,
        projects: updateProj,
      };

      const action = await dispatch(upsertUserProjects(transformedPayload));
      await dispatch(updateLocalProjects(updateProj));
      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_deleted_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_wrong_when_deleting_image'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    },
    [dispatch, projects, toast, user]
  );

  const deleteImages = useCallback(
    async (attributeId: string, images: { folderName: string; imageId: string }[]) => {
      const updateProj = _.cloneDeep(projects);
      updateProj.forEach((project: IProject) => {
        if (project.attributeId === attributeId && project.value) {
          // Remove from folders
          if (project.value.folders) {
            project.value.folders = project.value.folders.map((folder: Folder) => {
              const filteredImages = folder.images.filter((img: any) => {
                const imgId = img.id || img.attributeId;
                return !images.some((del) => del.folderName === folder.name && del.imageId === imgId);
              });
              return {
                ...folder,
                images: filteredImages,
              };
            });
          }

          // Remove from main project images
          if (project.value.images) {
            project.value.images = project.value.images.filter((img: any) => {
              const imgId = img.id || img.attributeId;
              return !images.some((del) => del.imageId === imgId);
            });
          }
        }
      });

      const transformedPayload = {
        userId: user?.id,
        projects: updateProj,
      };

      const action = await dispatch(upsertUserProjects(transformedPayload));
      await dispatch(updateLocalProjects(updateProj));
      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_deleted_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_wrong_when_deleting_image'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    },
    [dispatch, projects, toast, user]
  );

  const deactiveImage = useCallback(
    async (imageId: string, hasNotification = true) => {
      const action = await dispatch(deactiveUnassignedImage(imageId));
      if (!hasNotification) return;
      if (deactiveUnassignedImage.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_deleted_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
        return true;
      } else {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_wrong_when_deleting_image'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
      return false;
    },
    [toast]
  );

  const moveImage = useCallback(
    async (payload: MoveImageToFolderAction, isUnassigned = false) => {
      const imageId: string = payload.selectedImage.imageData.attributeId || payload.selectedImage.imageData.id;
      const updateProj = _.cloneDeep(projects);

      updateProj.forEach((project: IProject) => {
        // Handle moving to destination folder
        if (project.attributeId === payload.to.projectId && project.value?.folders) {
          const toFolder = project.value.folders[payload.to.folderIndex];
          if (toFolder) {
            // Check if image already exists in destination folder to prevent duplicates
            const imageExists = toFolder.images.some((img: any) => {
              const existingId = img.id || img.attributeId;
              return existingId === imageId;
            });

            if (!imageExists) {
              toFolder.images.push(payload.selectedImage?.imageData);
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

      const transformedPayload = {
        userId: user?.id,
        projects: updateProj,
      };

      const action = await dispatch(upsertUserProjects(transformedPayload));
      await dispatch(updateLocalProjects(updateProj));

      if (isUnassigned) {
        await deactiveImage(imageId, false);
        await dispatch(getUnassignedAttributes({ page: 1, limit: 20, userId: user.id }));
      }

      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_moved_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_wrong_when_moving_image'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    },
    [dispatch, projects, toast, user, deactiveImage]
  );

  const moveImages = useCallback(
    async (payload: MoveImagesToFolderAction, isUnassigned = false) => {
      const imageIds: string[] = payload.selectedImages.map((img) => {
        // Handle cases where imageData might be undefined
        if (!img.imageData) {
          return img.imageId;
        }
        return img.imageData.attributeId || img.imageData.id || img.imageId;
      });

      const updateProj = _.cloneDeep(projects);

      updateProj.forEach((project: IProject) => {
        // Add images to destination folder
        if (project.attributeId === payload.to.projectId && project.value?.folders) {
          const toFolder = project.value.folders[payload.to.folderIndex];
          if (toFolder) {
            payload.selectedImages.forEach((img) => {
              // Use the actual image data or fallback to a basic structure
              const imageToAdd = img.imageData;
              const imageId = imageToAdd.attributeId || imageToAdd.id || img.imageId;
              const imageExists = toFolder.images.some((existingImg: any) => (existingImg.id || existingImg.attributeId) === imageId);
              if (!imageExists) {
                toFolder.images.push(imageToAdd);
              }
            });
          }
        }

        // Remove images from source folder
        if (project.attributeId === payload.from.projectId && project.value?.folders) {
          const fromFolder = project.value.folders[payload.from.folderIndex];
          if (fromFolder) {
            fromFolder.images = (fromFolder.images || []).filter((img: any) => {
              const imgId = img.id || img.attributeId;
              return !imageIds.includes(imgId);
            });
          }
        }

        // Remove images from main project images if they exist there
        if (project.attributeId === payload.from.projectId && project.value?.images) {
          project.value.images = project.value.images.filter((img: any) => {
            const imgId = img.id || img.attributeId;
            return !imageIds.includes(imgId);
          });
        }
      });

      const transformedPayload = {
        userId: user?.id,
        projects: updateProj,
      };

      const action = await dispatch(upsertUserProjects(transformedPayload));
      await dispatch(updateLocalProjects(updateProj));

      if (isUnassigned) {
        for (const imageId of imageIds) {
          await deactiveImage(imageId, false);
        }
        await dispatch(getUnassignedAttributes({ page: 1, limit: 20, userId: user.id }));
      }

      if (upsertUserProjects.fulfilled.match(action)) {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('image_moved_successfully'),
          status: 'success',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      } else {
        toast({
          title: translatorNotificationNS('image'),
          description: translatorNotificationNS('something_wrong_when_moving_image'),
          status: 'error',
          duration: 5000,
          position: 'bottom-right',
          isClosable: true,
        });
      }
    },
    [dispatch, projects, toast, user, deactiveImage]
  );

  const convertArrayToObject = (array: any = []) => {
    const imageIdsObject: { [key: string]: any } = {};

    function collectImageInfo(item: any) {
      const projectTitle = item.value?.title || 'Unknown Project';

      // Direct images in the project (if any)
      if (item.value?.images && Array.isArray(item.value.images)) {
        item.value.images.forEach((image: any) => {
          const imageId = image.id || image.attributeId;
          if (imageId) {
            imageIdsObject[imageId] = {
              ...image,
              projectTitle,
              location: 'main',
              createdAt: item.createdAt,
            };
          }
        });
      }

      // Images in folders
      if (item.value?.folders && Array.isArray(item.value.folders)) {
        item.value.folders.forEach((folder: any) => {
          const folderName = folder.name || 'Unknown Folder';

          if (folder.images && Array.isArray(folder.images)) {
            folder.images.forEach((image: any) => {
              const imageId = image.id || image.attributeId;
              if (imageId) {
                if (!imageIdsObject[imageId]) {
                  imageIdsObject[imageId] = {
                    ...image,
                    projectTitle,
                    folderName,
                    location: 'folder',
                    createdAt: item.createdAt,
                  };
                } else {
                  if (!imageIdsObject[imageId].folders) {
                    imageIdsObject[imageId].folders = [imageIdsObject[imageId].folderName];
                  }

                  if (!imageIdsObject[imageId].folders.includes(folderName)) {
                    imageIdsObject[imageId].folders.push(folderName);
                  }
                }
              }
            });
          }

          if (folder.folders && Array.isArray(folder.folders)) {
            const nestedItem = {
              value: {
                title: projectTitle,
                folders: folder.folders,
              },
              createdAt: item.createdAt,
            };
            collectImageInfo(nestedItem);
          }
        });
      }
    }

    for (const item of array) {
      try {
        collectImageInfo(item);
      } catch (error) {
        console.error('Lỗi khi xử lý item:', item.attributeId, error);
      }
    }

    return imageIdsObject;
  };

  const imagesAssignedProject = useMemo(() => convertArrayToObject(projects), [projects]);

  function filterArrayByIds(smallerArray: any[]) {
    // Handle undefined or empty arrays
    if (!smallerArray || !Array.isArray(smallerArray) || smallerArray.length === 0) {
      return [];
    }
    if (!assignedAttributes || !Array.isArray(assignedAttributes)) {
      return [];
    }

    const idSet = new Set(
      smallerArray.map((item) => {
        if (item.id) return item.id;
        else if (item.attributeId) return item.attributeId;
      })
    );

    return assignedAttributes.filter((item: any) => idSet.has(item.attributeId) || idSet.has(item.id));
  }

  return {
    projects,
    unassignedAttributes,
    assignedAttributes,
    uploads,
    loading,
    imagesAssignedProject,
    filterArrayByIds,
    editFolder,
    editProjectTitleAndDescription,
    deleteProject,
    assignImageToFolder,
    deleteFolder,
    createFolder,
    createProject,
    moveImage,
    moveImages,
    deleteImage,
    deleteImages,
    deactiveImage,
    error,
  };
};

interface TransformedProject {
  userId: string;
  projects: {
    method: string;
    userId: string;
    attributeId: string | undefined;
    value: {
      type: string;
      title: string;
      folders: Folder[];
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
      method: project.method || '',
      attributeId: project.attributeId,
      value: {
        type: project.value?.type || '',
        title: project.value?.title || '',
        folders: project.value?.folders || [],
        description: project.value?.description || '',
      },
      actions: typeof project.actions === 'string' ? JSON.parse(project.actions || '{}') : project.actions,
      createdAt: project.createdAt,
      type: project.type,
    })),
  };
};

