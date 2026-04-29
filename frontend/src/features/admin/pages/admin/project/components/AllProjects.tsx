import { Box, Flex, HStack, Button as ChakraButton, Tooltip } from '@chakra-ui/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Empty from '@/components/Empty';
import { CreateProjectParams } from '@/types';
import GridView from './GridView';
import ListView from './ListView';
import ModalCreateProject from './ModalCreateProject';
import {
  ActionEntity,
  GeneratedImageAttributeEntity,
  OriginalImageAttributeEntity,
  ProjectAttributeEntity,
} from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity, UserAttributesDto } from '@/common/dtos/attribute/userAttribute.dto';
import { CreateProjectsDto } from '@/common/dtos/attribute/createProject.dto';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { LoadingCards } from './LoadingCards';
import { projectImagesSelector } from '@/selectors/project';
import { UserProjectManagement } from '@/hooks/project';
import { orderBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from 'lucide-react';
import FilterModal from '../../inspiration/components/FilterDialog/FilterDialog';
import { FilterState } from '../../inspiration/types/filterDropdown';
import { FilterButton } from '@/components/FilterButton';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import AddIconThin from '@/shared/icons/AddIconThin';
import { countActiveFilters, FilterField } from '@/utils/filterUtils';
import { ProjectFilters } from '@/types/project';

interface AllProjectsProps {
  data: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[];
  onFiltersChange?: (value: ProjectFilters) => void;
  reloadData?: () => void;
  handleCreateProjects?: (createProjectParams: CreateProjectParams) => void;
  handleDeleteProjects?: (id: string) => void;
  handleBulkUpsertProjects?: (projectName: string, projectDescription: string) => void;
  upsertProjects: (createProjectsDto: CreateProjectsDto) => Promise<UserAttributesDto[]>;
  onSelectProject?: (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => void;
  canCreateProject?: boolean;
  projectLimitMessage?: string;
  onUpgradeClick?: () => void;
}

const FILTER_MODAL_FIELDS: FilterField[] = ['name', 'models', 'time'];

const AllProjects: React.FC<AllProjectsProps> = ({
  data,
  reloadData,
  onSelectProject,
  handleCreateProjects,
  canCreateProject = true,
  projectLimitMessage = '',
  onUpgradeClick,
}) => {
  const { t } = useTranslation();
  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const assignedProjectImage = useSelector(projectImagesSelector);

  const { editProjectTitleAndDescription } = UserProjectManagement();
  const [selectedViewOption, setSelectedViewOption] = useState<'grid' | 'list'>('grid');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editProjectMode, setEditProjectMode] = useState<boolean>(false);
  const [currentProjectEdit, setCurrentProjectEdit] = useState<UserAttributeEntity<ProjectAttributeEntity, ActionEntity> | null>(null);

  useEffect(() => {
    setProjectsList(assignedProjectImage);
  }, [assignedProjectImage]);

  const handleViewChange = (view: 'grid' | 'list') => {
    setSelectedViewOption(view);
  };

  const openModalEdit = (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => {
    setEditProjectMode(true);
    const selectProject = data.find((elt) => elt.attributeId === project.projectAttributeId) || null;
    setCurrentProjectEdit(selectProject);

    setOpenModal(true);
  };

  const onClose = () => {
    setOpenModal(false);

    setEditProjectMode(false);
    setCurrentProjectEdit(null);
  };

  const handleEditProject = async (projectName: string, projectDescription: string) => {
    const projectId = currentProjectEdit?.attributeId || '';
    editProjectTitleAndDescription(projectId, projectName, projectDescription);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Optimistically update local list immediately
      setProjectsList((prevList) => prevList.filter((project) => project.projectAttributeId !== projectId));

      // Call the delete function from hook
      const { deleteProject } = UserProjectManagement();
      await deleteProject(projectId);

      // Trigger parent reload
      if (reloadData) {
        reloadData();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);

      // Revert optimistic update on error
      setProjectsList(assignedProjectImage);
    }
  };

  // load Images
  const assignedUserImages: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[] =
    useSelector((state: RootState) => state.projectManagement.assignedAttributes);

  const { loading } = useSelector((state: RootState) => state.projectManagement);

  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterClose = () => {
    setIsFilterOpen(false);
  };

  const handleApplyFilter = (filters: FilterState) => {
    setSelectedFilters(filters);
    setIsFilterOpen(false);
  };

  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    name: '',
    models: [],
    time: '',
  });
  const baseFilterLabel = translatorCommonNS('filter');
  const appliedFilterCount = countActiveFilters(selectedFilters, FILTER_MODAL_FIELDS);
  const filterButtonLabel = appliedFilterCount > 0 ? `${appliedFilterCount} ${baseFilterLabel}` : baseFilterLabel;
  const isFilterButtonActive = isFilterOpen || appliedFilterCount > 0;


  const filteredProjects = useMemo(() => {
    let newList = [...projectsList];

    if (selectedFilters.name) {
      newList = orderBy(newList, 'projectTitle', selectedFilters.name === 'asc' ? 'asc' : 'desc');
    }

    if (selectedFilters && Array.isArray(selectedFilters.models) && selectedFilters.models.length > 0) {
      newList = newList?.filter((project) => {
        const inputType = project?.type || '';
        return (selectedFilters.models ?? []).includes(inputType);
      });
    }

    if (selectedFilters.time) {
      newList = orderBy(newList, 'updatedAt', selectedFilters.time === 'oldest' ? 'asc' : 'desc');
    }

    return newList || [];
  }, [projectsList, selectedFilters.time, selectedFilters.name, selectedFilters.models]);

  const renderContent = () => {
    if (loading && filteredProjects?.length === 0) {
      return <LoadingCards />;
    }

    if (!loading && filteredProjects?.length === 0) {
      return (
        <Flex direction="column" align="center" justify="center" h="calc(100vh - 142px)">
          <Empty
            emptyText={t('notification:no_projects_yet')}
            emptyDesc={t('notification:get_started_by_creating_your_first_project_to_begin_managing_your_work_efficiently')}
          />
          <Tooltip isDisabled={canCreateProject} label={projectLimitMessage} hasArrow placement="top">
            <ChakraButton
              variant="primary"
              leftIcon={<AddIconThin />}
              onClick={() => setOpenModal(true)}
              mt={4}
              isDisabled={!canCreateProject}
            >
              {translatorCommonNS('create_project')}
            </ChakraButton>
          </Tooltip>
        </Flex>
      );
    }

    return selectedViewOption === 'grid' ? (
      <GridView data={filteredProjects} onEdit={openModalEdit} onSelectProject={onSelectProject} onDelete={handleDeleteProject} />
    ) : (
      <ListView data={filteredProjects} onSelectProject={onSelectProject} />
    );
  };

  return (
    <Box w="full">
      <Flex align="center" justify="space-between" w="full" mb={4}>
        <ViewSwitcher view={selectedViewOption} onChange={handleViewChange} />

        <HStack spacing={2}>
          <Box position="relative" ref={filterRef}>
            <FilterButton
              label={filterButtonLabel}
              onClick={handleFilterOpen}
              isActive={isFilterButtonActive}
              justifyContent="space-between"
              rightIcon={<Box as="span" display="inline-flex"><ChevronDownIcon size={16} /></Box>}
            />
            {isFilterOpen && (
              <Box position="absolute" top="100%" right={0} zIndex={50} mt={2}>
                <FilterModal
                  onApplyFilter={handleApplyFilter}
                  onCancel={handleFilterClose}
                  initialFilters={selectedFilters}
                  filterFields={FILTER_MODAL_FIELDS}
                />
              </Box>
            )}
          </Box>

          <Tooltip isDisabled={canCreateProject} label={projectLimitMessage} hasArrow placement="top">
            <ChakraButton
              variant="secondary"
              leftIcon={<AddIconThin />}
              onClick={() => setOpenModal(true)}
              size="sm"
              isDisabled={!canCreateProject}
            >
              {translatorCommonNS('create_project')}
            </ChakraButton>
          </Tooltip>
          {!canCreateProject && onUpgradeClick && (
            <ChakraButton variant="primary" size="sm" onClick={onUpgradeClick}>
              {translatorCommonNS('upgrade')}
            </ChakraButton>
          )}
        </HStack>
      </Flex>

      <Box>{renderContent()}</Box>

      <ModalCreateProject
        modelData={currentProjectEdit}
        editMode={editProjectMode}
        isOpen={openModal}
        onClose={onClose}
        onEdit={handleEditProject}
        onCreate={handleCreateProjects}
      />
    </Box>
  );
};

export default AllProjects;



