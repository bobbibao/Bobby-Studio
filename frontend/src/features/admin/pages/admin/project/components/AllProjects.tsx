import { Box, Flex, HStack, Button as ChakraButton, Tooltip, Heading, Text, useColorModeValue } from '@chakra-ui/react';
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
import { CardDataProps } from '@/shared/card/CardProject';

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
  const { t, i18n } = useTranslation();
  const isViet = i18n.language?.toLowerCase().startsWith('vi');
  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const assignedProjectImage = useSelector(projectImagesSelector);

  const { editProjectTitleAndDescription, deleteProject } = UserProjectManagement();
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

  const openModalEdit = (project: CardDataProps) => {
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
      {/* Futuristic Project Vault Hero Banner */}
      <Box pt={1} pb={4} w="full">
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'start', md: 'center' }} gap={4}>
          <Box>
            <Flex align="center" gap={2} mb={1}>
              <Box
                px={2}
                py={0.5}
                rounded="full"
                bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.15)')}
                border="1px solid"
                borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.3)')}
                fontSize="2xs"
                fontWeight="700"
                color="brand.400"
                letterSpacing="0.06em"
                textTransform="uppercase"
              >
                ✦ Neural Asset Vault
              </Box>
            </Flex>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" letterSpacing="-0.02em" color="text.primary">
              {isViet ? 'Quản Lý Dự Án & Không Gian Sáng Tạo' : 'Projects & Asset Workspace'}
            </Heading>
            <Text fontSize="xs" color="text.muted" mt={0.5}>
              {isViet
                ? 'Lưu trữ các phiên tạo hình AI, thư mục moodboard và bộ sưu tập tác phẩm chất lượng cao.'
                : 'Organize generation sessions, asset iterations, and multi-prompt collections.'}
            </Text>
          </Box>
        </Flex>
      </Box>

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
              bg="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)"
              color="white"
              _hover={{
                filter: 'brightness(1.1)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 14px rgba(127, 86, 217, 0.4)',
              }}
              _active={{ transform: 'translateY(0)' }}
              leftIcon={<AddIconThin />}
              onClick={() => setOpenModal(true)}
              size="sm"
              borderRadius="xl"
              boxShadow="0 2px 10px rgba(127, 86, 217, 0.3)"
              isDisabled={!canCreateProject}
            >
              {translatorCommonNS('create_project')}
            </ChakraButton>
          </Tooltip>
          {!canCreateProject && onUpgradeClick && (
            <ChakraButton variant="primary" size="sm" borderRadius="xl" onClick={onUpgradeClick}>
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



