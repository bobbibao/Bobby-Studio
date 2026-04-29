import React, { useCallback, useEffect, useState } from 'react';
import { Box, Flex, useToast } from '@chakra-ui/react';
import { UserProjectManagement } from '@/hooks/project';
import { PROJECT_TREE_ITEM } from '@/constants';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { updateSelectedProjectId } from '@/reducers/project';
import { ActionEntity, Folder, GeneratedImageAttributeEntity, ProjectAttributeEntity, VImage } from '@/common/dtos/attribute/common.dto';
import { CreateProjectParams, ImageData } from '@/types';
import GridFolderItems from '@/features/admin/pages/admin/project/components/GridFolderItems';
import { AttributeTypeEnum, InputTypeEnum } from '@/constants/attribute-enum';
import AllProjects from '@/features/admin/pages/admin/project/components/AllProjects';
import GridChildProject from '@/features/admin/pages/admin/project/components/GridChildProject';
import { useProjectService } from '@/services/project';
import { useSelector } from 'react-redux';
import {
  assignImageToFolder,
  getUnassignedAttributes,
  getUserAssignedImages,
  getUserProjects,
  getUserUploads,
  upsertUserProjects,
} from '@/actions/project';
import { RootState } from '@/store';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { useTranslation } from 'react-i18next';
import { GetUnassignedUserImagesAction } from '@/features/admin/pages/admin/project/types/project';
import FolderTree from '@/components/FolderTree';
import { BreadcrumbItemType } from '@/types/breadcrumb';
import { PaginationType } from '@/types/pagination';
import { getProjectLimit, getProjectLimitMessage, resolvePlan } from '@/utils/subscriptionRestrictions';
import { useNavigate } from 'react-router-dom';

enum DisplayModeOption {
  ALL_PROJECT = 'All Project',
  CHILD_PROJECT = 'Child Project',
  UNASSIGNED = 'Unassigned',
  UPLOADS = 'Uploads',
  FOLDER_ITEM = 'Folder Item',
}

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const { projects, createFolder, unassignedAttributes, assignedAttributes, uploads, imagesAssignedProject } = UserProjectManagement();
  const [displayMode, setDisplayMode] = useState<DisplayModeOption>(DisplayModeOption.ALL_PROJECT);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [foldersOfEachProject, setFoldersOfEachProject] = useState<Folder[]>([]);
  const [imagesOfEachProject, setImagesOfEachProject] = useState<ImageData[]>([]);
  const [folderData, setFolderData] = useState<Folder>();
  const [activeItem, setActiveItem] = useState<string | null>(PROJECT_TREE_ITEM.ALL_PROJECT);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeChildFolder, setActiveChildFolder] = useState<string | null>(null);
  const [activeChildProject, setActiveChildProject] = useState<string | null>(null);

  // Breadcrumb path: [project, folder1, folder2, ...]
  const [folderPath, setFolderPath] = useState<BreadcrumbItemType[]>([
    { displayName: 'Project', id: PROJECT_TREE_ITEM.ALL_PROJECT, type: 'project' },
  ]);
  const dispatch = useAppDispatch();
  const { fetchProjectAndFolder, upsertProjects } = useProjectService();
  const { user: currentUser } = useSelector((state: RootState) => state.currentUser);
  const userId = currentUser?.id;
  const toast = useToast();
  const navigate = useNavigate();

  const planCode = resolvePlan(currentUser?.role, currentUser?.subscription?.plan);
  const projectLimit = getProjectLimit(planCode);
  const projectLimitMessageConfig = getProjectLimitMessage(planCode);
  const projectLimitMessage = projectLimitMessageConfig
    ? t(projectLimitMessageConfig.key, { defaultValue: projectLimitMessageConfig.fallback })
    : '';
  const projectCount = projects?.length ?? 0;
  const isProjectLimitReached = projectLimit !== null && projectCount >= projectLimit;
  const canCreateProject = !isProjectLimitReached;

  // Pagination state for unassigned images
  const [unassignedPagination, setUnassignedPagination] = useState<PaginationType>({
    total: 0,
    pageSize: 20,
    currentPage: 1,
    pages: 0,
  });

  // Loading state for unassigned images
  const [isUnassignedLoading, setIsUnassignedLoading] = useState(false);

  // Filter state for unassigned images
  const [unassignedFilters, setUnassignedFilters] = useState<{
    orderBy: 'asc' | 'desc';
    inputType: string[];
    creationType: string;
  }>({
    orderBy: 'desc',
    inputType: [],
    creationType: '',
  });

  // Pagination state for uploads
  const [uploadsPagination, setUploadsPagination] = useState<PaginationType>({
    total: 0,
    pageSize: 20,
    currentPage: 1,
    pages: 0,
  });

  // Filter state for uploads
  const [uploadsFilters, setUploadsFilters] = useState<{
    orderBy: 'asc' | 'desc';
    inputType: string[];
    creationType: string;
  }>({
    orderBy: 'desc',
    inputType: [],
    creationType: '',
  });

  // Loading state for uploads
  const [isUploadsLoading, setIsUploadsLoading] = useState(false);

  const fetchUnassignedData = useCallback(
    async (pagination: PaginationType, orderBy?: 'asc' | 'desc', inputType?: string[], creationType?: string, _isNextPage = false) => {
      if (!userId) return;

      setIsUnassignedLoading(true);
      try {
        const params: GetUnassignedUserImagesAction = {
          userId,
          page: pagination.currentPage,
          limit: pagination.pageSize,
          orderBy,
          inputType: inputType && inputType.length > 0 ? inputType : [],
          creationType: creationType ?? '',
        };

        const response = await dispatch(getUnassignedAttributes(params));

        if (response.payload && typeof response.payload === 'object' && 'data' in response.payload) {
          const payload = response.payload as { data: any[]; total: number };
          const hasNextPage = payload.data.length === pagination.pageSize;

          setUnassignedPagination((prev) => ({
            ...prev,
            total: payload.total,
            pages: Math.ceil(payload.total / prev.pageSize),
            hasNextPage,
          }));
        }
      } finally {
        setIsUnassignedLoading(false);
      }
    },
    [dispatch, userId]
  );

  const fetchUploadsData = useCallback(
    async (pagination: PaginationType, orderBy?: 'asc' | 'desc') => {
      if (!userId) return;

      setIsUploadsLoading(true);
      try {
        const response = await dispatch(
          getUserUploads({
            userId,
            page: pagination.currentPage,
            limit: pagination.pageSize,
            orderBy: orderBy || 'desc',
          })
        );

        if (response.payload && typeof response.payload === 'object' && 'data' in response.payload) {
          const payload = response.payload as { data: any[]; total: number };

          setUploadsPagination((prev) => ({
            ...prev,
            total: payload.total,
            pages: Math.ceil(payload.total / prev.pageSize),
          }));
        }
      } finally {
        setIsUploadsLoading(false);
      }
    },
    [dispatch, userId]
  );

  const handleUnassignedFilterChange = useCallback(
    (filters: { orderBy?: 'asc' | 'desc'; inputType?: string[]; creationType?: string }) => {
      // Update filter state
      const newFilters = {
        orderBy: filters.orderBy || 'desc',
        inputType: filters.inputType || [],
        creationType: filters.creationType || '',
      };
      setUnassignedFilters(newFilters);

      // Reset pagination to page 1 when filters change
      const resetPagination = {
        ...unassignedPagination,
        currentPage: 1,
        lastCreatedAt: undefined,
        lastId: undefined,
      };
      setUnassignedPagination(resetPagination);

      // Fetch data with new filters
      fetchUnassignedData(resetPagination, newFilters.orderBy, newFilters.inputType, newFilters.creationType, false);
    },
    [fetchUnassignedData, unassignedPagination]
  );

  const handleUploadsFilterChange = useCallback(
    (filters: { orderBy?: 'asc' | 'desc'; inputType?: string[]; creationType?: string }) => {
      const newFilters = {
        orderBy: filters.orderBy || 'desc',
        inputType: [],
        creationType: filters.creationType || '',
      };
      setUploadsFilters(newFilters);

      // Reset pagination to page 1 when filters change
      const resetPagination: PaginationType = {
        ...uploadsPagination,
        currentPage: 1,
      };
      setUploadsPagination(resetPagination);

      // Fetch uploads data with new order
      fetchUploadsData(resetPagination, newFilters.orderBy);
    },
    [fetchUploadsData, uploadsPagination]
  );

  const onTreeItemClick = useCallback(
    (clickType: string, attributeId?: string, value?: string) => {
      switch (clickType) {
        case PROJECT_TREE_ITEM.ALL_PROJECT:
          setDisplayMode(DisplayModeOption.ALL_PROJECT);
          setActiveItem(PROJECT_TREE_ITEM.ALL_PROJECT);
          setActiveFolderId(null);
          setActiveChildFolder(null);
          setActiveChildProject(null);
          setFolderPath([{ displayName: 'Project', id: PROJECT_TREE_ITEM.ALL_PROJECT, type: 'project' }]);
          break;
        case PROJECT_TREE_ITEM.UNASSIGNED:
          setDisplayMode(DisplayModeOption.UNASSIGNED);
          setActiveItem(PROJECT_TREE_ITEM.UNASSIGNED);
          setActiveFolderId(null);
          setActiveChildFolder(null);
          setActiveChildProject(null);
          setFolderPath([]);
          // Fetch unassigned data when clicking on unassigned tab
          const initialPagination: PaginationType = {
            total: 0,
            pageSize: 20,
            currentPage: 1,
            pages: 0,
          };
          fetchUnassignedData(initialPagination, 'desc', [], '', false);
          break;
        case PROJECT_TREE_ITEM.UPLOADS:
          setDisplayMode(DisplayModeOption.UPLOADS);
          setActiveItem(PROJECT_TREE_ITEM.UPLOADS);
          setActiveFolderId(null);
          setActiveChildFolder(null);
          setActiveChildProject(null);
          setFolderPath([]);
          // Fetch uploads data when clicking on uploads tab
          const uploadsInitialPagination: PaginationType = {
            total: 0,
            pageSize: 20,
            currentPage: 1,
            pages: 0,
          };
          setUploadsPagination(uploadsInitialPagination);
          fetchUploadsData(uploadsInitialPagination, 'desc');
          break;
        case PROJECT_TREE_ITEM.CHILD_PROJECT: {
          dispatch(updateSelectedProjectId(attributeId));
          setActiveItem(PROJECT_TREE_ITEM.CHILD_PROJECT);
          setActiveFolderId(null);
          setActiveChildFolder(null);
          setActiveChildProject(attributeId as string);
          setDisplayMode(DisplayModeOption.CHILD_PROJECT);
          setCurrentProjectId(attributeId as string);
          const project = projects.find((p) => p.attributeId === attributeId);
          if (project && project.value) {
            setFoldersOfEachProject(project.value.folders || []);
            const imagesInFolder = project.value.folders?.flatMap((folder) => folder.images) || [];
            const imagesInProject: VImage[] = project.value.images || [];
            setImagesOfEachProject([...imagesInFolder, ...imagesInProject]);
            // Set breadcrumb to project
            setFolderPath((prev) => [
              { displayName: 'Project', id: PROJECT_TREE_ITEM.ALL_PROJECT, type: 'project' },
              {
                displayName: project?.value?.title || 'Project',
                id: attributeId as string,
                type: 'project',
              },
            ]);
          }
          break;
        }
        default: {
          // For folder clicks, use the same logic as onFolderClick to ensure consistency
          onFolderClick(attributeId, value);
          break;
        }
      }
    },
    [projects, dispatch, fetchUnassignedData, fetchUploadsData]
  );

  const handleFetchFolderTree = async () => {
    await fetchProjectAndFolder();
  };

  const reloadData = () => {
    handleFetchFolderTree();
    // Also refresh user projects to ensure consistency
    if (userId) {
      if (userId) {
        dispatch(getUserProjects({ userId: userId, orderBy: 'desc', inputType: [], creationType: '' }));
      }
    }
  };

  const handleCreateProjects = async (createProjectParams: CreateProjectParams) => {
    if (!canCreateProject) {
      toast({
        title: translatorNotificationNS('project'),
        description: projectLimitMessage || translatorNotificationNS('project_limit_reached'),
        status: 'info',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      return;
    }

    const { projectName, projectDescription } = createProjectParams;
    const projectValue: ProjectAttributeEntity = {
      title: projectName,
      type: AttributeTypeEnum.PROJECT,
      description: projectDescription,
    };

    const newPro = {
      userId,
      projects: [
        ...projects,
        {
          userId,
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
      const payload = action.payload as any;
      const status = payload?.status;
      const errorMessage =
        payload?.message || translatorNotificationNS('something_wrong_when_creating_project');
      const description = status === 403 && projectLimitMessage ? projectLimitMessage : errorMessage;

      toast({
        title: translatorNotificationNS('project'),
        description,
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
    if (userId) {
      dispatch(getUserProjects({ userId: userId, orderBy: 'desc', inputType: [], creationType: '' }));
    }
  };

  const onFolderClick = useCallback(
    (attributeId?: string, value?: string) => {
      setDisplayMode(DisplayModeOption.FOLDER_ITEM);
      setActiveFolderId(`${attributeId}-${value}`);
      const currentProject = projects.find((p) => p.attributeId === attributeId);
      if (currentProject && currentProject.value && currentProject.value.folders) {
        const folder = currentProject.value.folders.find((folder) => folder?.name === value);
        setFolderData(folder);
        // Update breadcrumb path: handle same-level folders correctly
        setFolderPath((prev) => {
          const newFolderItem: BreadcrumbItemType = {
            displayName: value || '',
            id: `${attributeId}-${value}`,
            type: 'folder',
          };

          const projectBreadcrumb: BreadcrumbItemType = {
            displayName: 'Project',
            id: PROJECT_TREE_ITEM.ALL_PROJECT,
            type: 'project',
          };

          // Ensure we start with the correct project
          const currentProjectBreadcrumb: BreadcrumbItemType = {
            displayName: currentProject.value?.title || 'Project',
            id: `${attributeId}-${currentProject.value?.title}`,
            type: 'project',
          };

          // If current path is empty or doesn't start with this project, reset and add project + folder
          if (!prev.length || !prev[1] || (prev[1].id !== attributeId && prev[1].type !== newFolderItem.type)) {
            return [projectBreadcrumb, currentProjectBreadcrumb, newFolderItem];
          }

          // If clicking on the same folder that's already the last item, do nothing
          const lastItem = prev[prev.length - 1];
          if (lastItem.id === newFolderItem.id && lastItem.type === newFolderItem.type) {
            return prev; // No change needed
          }

          // If the last item is a folder from the same project, replace it (same-level navigation)
          if (lastItem.type === 'folder') {
            return [...prev.slice(0, -1), newFolderItem];
          }

          // Otherwise append the folder (going deeper or first folder from project)
          return [...prev, newFolderItem];
        });
      }
    },
    [projects]
  );

  const onSelectProject = (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => {
    const projectId = (project?.projectAttributeId || project?.value?.id || project?.attributeId) as string;
    setCurrentProjectId(projectId);
    onTreeItemClick(PROJECT_TREE_ITEM.CHILD_PROJECT, projectId, project?.projectTitle || project?.value?.title || '');
  };

  const onCreateFolder = async (projectId: string, folderName: string) => {
    createFolder(projectId, folderName);
  };

  useEffect(() => {
    if (Object.keys(imagesAssignedProject).length > 0) {
      const getUserImagesAction: any = {
        userId: currentUser?.id ?? '',
        images: Object.keys(imagesAssignedProject) || [],
        page: 1,
        limit: 100,
      };
      dispatch(getUserAssignedImages(getUserImagesAction));
    }
  }, [dispatch, currentUser, imagesAssignedProject]);

  const handleDragUnassignedImageToFolder = useCallback(
    async (projectId: string, folderName: string, img: ImageData) => {
      const imagePath = (img.path || '') as string;
      const imageValue: GeneratedImageAttributeEntity = {
        key: (img.id as string) || imagePath,
        path: imagePath,
      };
      await dispatch(
        assignImageToFolder({
          attributeId: projectId,
          folderName,
          image: { id: img.id as string, path: imagePath, value: imageValue },
        })
      );
      if (userId) {
        await dispatch(getUnassignedAttributes({ page: 1, limit: 20, userId }));
      }
      toast({
        title: translatorNotificationNS('folder'),
        description: translatorNotificationNS('image_assigned_successfully'),
        status: 'success',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    },
    [dispatch, toast, userId]
  );
  // Breadcrumb click handler
  const handleBreadcrumbClick = (idx: number) => {
    // Guard against invalid index or empty folderPath
    if (!folderPath || idx >= folderPath.length || idx < 0) {
      console.warn('Invalid breadcrumb index or empty folderPath');
      return;
    }

    const clickedItem = folderPath[idx];

    // Guard against undefined clickedItem
    if (!clickedItem) {
      console.warn('Clicked breadcrumb item is undefined');
      return;
    }

    if (idx === 0) {
      setDisplayMode(DisplayModeOption.ALL_PROJECT);
      setActiveItem(PROJECT_TREE_ITEM.ALL_PROJECT);
      setActiveFolderId(null);
      setActiveChildFolder(null);
      setActiveChildProject(null);
      setFolderPath([{ displayName: 'Project', id: PROJECT_TREE_ITEM.ALL_PROJECT, type: 'project' }]);
      return;
    }

    if (clickedItem.type === 'project') {
      // Go to project root
      const project = projects.find((p) => p.attributeId === clickedItem.id);
      if (project) {
        onTreeItemClick(PROJECT_TREE_ITEM.CHILD_PROJECT, project.attributeId, project.value?.title);
      }
    } else if (clickedItem.type === 'folder') {
      // Go to folder - extract project ID and folder name from the folder ID
      const [projectId, ...folderNameParts] = clickedItem.id.split('-');
      const folderName = folderNameParts.join('-'); // Rejoin in case folder name contains dashes
      onFolderClick(projectId, folderName);
    }

    // Truncate breadcrumb path to clicked item
    setFolderPath(folderPath.slice(0, idx + 1));
  };

  return (
    <Flex direction="row" width={'full'} height="full" overflowY="hidden" borderTopRadius={'lg'}>
      <FolderTree
        projects={projects}
        onTreeItemClick={onTreeItemClick}
        onDropImage={handleDragUnassignedImageToFolder}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        activeFolderId={activeFolderId}
        setActiveFolderId={setActiveFolderId}
        activeChildFolder={activeChildFolder}
        setActiveChildFolder={setActiveChildFolder}
        activeChildProject={activeChildProject}
        setActiveChildProject={setActiveChildProject}
      />

      <Box px={4} py={4} mb={4} w="full" borderLeftWidth="1px" borderColor="border.default" h="full" bg="bg.canvas">
        {displayMode === DisplayModeOption.UNASSIGNED ? (
          <GridFolderItems
            projects={projects}
            parentProjectId={currentProjectId}
            folder={{
              id: '-1',
              name: 'Unassigned',
              type: AttributeTypeEnum.FOLDER,
              images: unassignedAttributes as any,
            }}
            data={[]}
            isUnassigned={true}
            handleBreadcrumbClick={() => {}}
            pagination={unassignedPagination}
            onPageChange={(page: number) => {
              const isNextPage = page > unassignedPagination.currentPage;
              const newPagination = { ...unassignedPagination, currentPage: page };

              if (page === 1) {
                newPagination.lastCreatedAt = undefined;
                newPagination.lastId = undefined;
              }

              setUnassignedPagination(newPagination);
              fetchUnassignedData(
                newPagination,
                unassignedFilters.orderBy,
                unassignedFilters.inputType,
                unassignedFilters.creationType,
                isNextPage
              );
            }}
            onFilterChange={handleUnassignedFilterChange}
            isLoading={isUnassignedLoading}
          />
        ) : displayMode === DisplayModeOption.UPLOADS ? (
          <GridFolderItems
            projects={projects}
            parentProjectId={currentProjectId}
            folder={{
              id: '-2',
              name: 'Uploads',
              type: AttributeTypeEnum.FOLDER,
              images: uploads as any,
            }}
            data={[]}
            isUnassigned={true}
            handleBreadcrumbClick={() => {}}
            pagination={uploadsPagination}
            onPageChange={(page: number) => {
              const newPagination = { ...uploadsPagination, currentPage: page };
              setUploadsPagination(newPagination);
              fetchUploadsData(newPagination, uploadsFilters.orderBy);
            }}
            onFilterChange={handleUploadsFilterChange}
            isLoading={isUploadsLoading}
          />
        ) : (
          <Flex align="center" justify="space-between" w="full">
            {displayMode === DisplayModeOption.ALL_PROJECT && (
              <AllProjects
                data={projects}
                reloadData={reloadData}
                handleCreateProjects={handleCreateProjects}
                upsertProjects={upsertProjects}
                onSelectProject={onSelectProject}
                canCreateProject={canCreateProject}
                projectLimitMessage={projectLimitMessage}
                onUpgradeClick={() =>
                  navigate('/profile#subscription', {
                    replace: false,
                  })
                }
              />
            )}

            {displayMode === DisplayModeOption.CHILD_PROJECT && (
              <GridChildProject
                projects={projects}
                onFolderClick={onFolderClick}
                data={foldersOfEachProject}
                images={imagesOfEachProject}
                parentProjectId={currentProjectId}
                onCreateFolder={onCreateFolder}
              />
            )}

            {displayMode === DisplayModeOption.FOLDER_ITEM && (
              <GridFolderItems
                projects={projects}
                parentProjectId={currentProjectId}
                folder={folderData as Folder}
                data={[]}
                isUnassigned={false}
                folderPath={folderPath}
                handleBreadcrumbClick={handleBreadcrumbClick}
              />
            )}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default Projects;



