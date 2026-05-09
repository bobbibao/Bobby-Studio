import React, { useState, useCallback, useEffect } from 'react';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import { Box, Flex, Heading, Button, SimpleGrid, useBreakpointValue, Tab, TabList, Tabs, Skeleton, keyframes, useBoolean } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import QuickActionCard from '../ai-design/components/QuickActionCard';
import PhotoIcon from '@/shared/icons/PhotoIcon';
import ImageCard from '@/shared/card/ImageCard';
import { ChevronDownIcon } from 'lucide-react';
import { HistoryAPI } from '@/actions/history';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import FilterModal from '../inspiration/components/FilterDialog/FilterDialog';
import { FilterState } from '../inspiration/types/filterDropdown';
import { PaginationType } from '@/types/pagination';
import Empty from '@/components/Empty';
import useLayoutStore from '@/store/layoutStore';
import ThreeColumnsIcon from '@/shared/icons/ThreeColumnsIcon';
import FourColumnsIcon from '@/shared/icons/FourColumnsIcon';
import { useAuthentication } from '@/hooks/useAuthentication';
import { motion } from 'framer-motion';
import { keyframes as emotionKeyframes } from '@emotion/react'; // Changed from @chakra-ui/react to @emotion/react
import { countActiveFilters, FilterField } from '@/utils/filterUtils';
import { useAuth } from '@/common/context/useAuthContext';
import { ModalTutorialVideo } from './components/ModalTutorialVideo';

const TYPE_FILTER_OPTIONS = ['exterior', 'interior'] as const;
type TypeFilterSelection = (typeof TYPE_FILTER_OPTIONS)[number] | '';

const FILTER_MODAL_FIELDS: FilterField[] = ['models', 'time'];

// --- Components ---

// Changed keyframes import to emotion
const pulse = emotionKeyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
`;

// Loading Skeleton Component for Grid
const HomeGridSkeleton: React.FC<{ columns: number }> = ({ columns }) => {
  return (
    <SimpleGrid
      columns={{
        base: 1,
        md: 2,
        lg: columns === 3 ? 3 : 4,
      }}
      spacing={2}
    >
      {Array.from({ length: 8 }).map((_, idx) => (
        <Box
          key={idx}
          position="relative"
          rounded="lg"
          overflow="hidden"
          h="250px"
          bg="bg.subtle"
          animation={`${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`}
        >
          <Skeleton height="100%" width="100%" startColor="transparent" endColor="transparent" />
        </Box>
      ))}
    </SimpleGrid>
  );
};

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthentication();
  const { columns, setColumns } = useLayoutStore();
  
  // Quick Actions Logic
  const quickActions = [
    {
      title: 'bobby_ai_studio',
      icon: <PhotoIcon />,
      linkTo: '/generate',
    },
    // Disabled — re-enable when canvas is ready
    // {
    //   title: 'canvas',
    //   icon: <CanvasIcon />,
    //   linkTo: '/generate?tab=canvas&mode=generate',
    //   isNew: true,
    // },
  ];

  const itemsPerRowTop = useBreakpointValue({ base: 1, md: 2, lg: 3, xl: 6 }) || 6;
  const displayedQuickActions = quickActions.slice(0, itemsPerRowTop);

  // Recent Creations Logic
  const [isLoading, setIsLoading] = useState(true);
  const [userImages, setUserImages] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const { user : userInfo,setAuthUser } = useAuth();
  const [modalVideo, toggleModalVideo] = useBoolean();
  useEffect(() => {
    if(userInfo?.lastLogin === null && userInfo?.hasSeenTutorial !== true){
        setAuthUser({ hasSeenTutorial: true})
        toggleModalVideo.on();
    }
  },[userInfo]);


  const [savedFilters, setSavedFilters] = useState<FilterState>({
    models: [],
    type: '',
    time: '',
  });
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    pageSize: 16,
    currentPage: 1,
    pages: 0,
  });

  const [openModalIndex, setOpenModalIndex] = useState<number>(-1);
  const { currentIndex, handleNext, handlePrev } = useImageNavigation({
    totalImages: userImages.length,
    initialIndex: openModalIndex,
    onIndexChange: (newIndex) => {
      setOpenModalIndex(newIndex);
    },
  });

  const fetchData = useCallback(
    async (paginationParam: PaginationType, orderBy: 'asc' | 'desc' = 'desc', creationType?: string, inputType?: string[]) => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const response = await HistoryAPI.getHistoryJobs(user.id, {
          page: paginationParam.currentPage,
          limit: paginationParam.pageSize,
          orderBy,
          creationType,
          inputType,
        });

        let data = [];
        if (response && response.data) {
          data = response.data.map((job: any) => ({
            ...job,
            attributeId: job.jobId || job.id || job._id,
            value: {
              key: job.imageKey,
              path: job.path || job.url || job.result,
              thumbnail: job.thumbnail,
              dimensions: job.dimensions,
            },
          }));

          const updatedPagination = {
            ...paginationParam,
            total: response.total || 0,
          };
          setPagination(updatedPagination);
        }
        setUserImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
        setUserImages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    const initialPagination = {
      total: 0,
      pageSize: 16,
      currentPage: 1,
      pages: 0,
    };
    const orderBy = savedFilters?.time === 'oldest' ? 'asc' : 'desc';
    if (user?.id) {
      fetchData(initialPagination, orderBy);
    }
  }, [fetchData, user?.id]);

  const handleApplyFilter = (filters: FilterState) => {
    const mergedFilters: FilterState = {
      ...savedFilters,
      ...filters,
      type: savedFilters.type,
    };
    const orderBy = mergedFilters.time === 'oldest' ? 'asc' : 'desc';
    const inputType = Array.isArray(mergedFilters.models) && mergedFilters.models.length > 0 ? mergedFilters.models : [];
    const updatedPagination = {
      ...pagination,
      currentPage: 1,
    };

    setSavedFilters(mergedFilters);
    setPagination(updatedPagination);
    fetchData(updatedPagination, orderBy, mergedFilters.type || undefined, inputType);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters: FilterState = {
      models: [],
      type: '',
      time: '',
    };
    setSavedFilters(resetFilters);
    const updatedPagination = {
      ...pagination,
      currentPage: 1,
    };
    setPagination(updatedPagination);
    fetchData(updatedPagination, 'desc');
  };
  const handleTypeFilterChange = (type: TypeFilterSelection) => {
    const nextType: string = type === '' ? '' : savedFilters.type === type ? '' : type;
    const updatedFilters: FilterState = {
      ...savedFilters,
      type: nextType,
    };
    const orderBy = updatedFilters.time === 'oldest' ? 'asc' : 'desc';
    const inputType = Array.isArray(updatedFilters.models) && updatedFilters.models.length > 0 ? updatedFilters.models : [];
    const updatedPagination = {
      ...pagination,
      currentPage: 1,
    };

    setSavedFilters(updatedFilters);
    setPagination(updatedPagination);
    setIsFilterOpen(false);
    fetchData(updatedPagination, orderBy, nextType || undefined, inputType);
  };

  const handleImageCardClick = (index: number) => {
    setOpenModalIndex(index);
  };

  const handleModalClose = () => {
    setOpenModalIndex(-1);
  };

  const handleColChange = (value: number) => {
    setColumns(value);
  };

  const translatorCommonNS = (key: string) => t(`common:${key}`);
  const baseFilterLabel = translatorCommonNS('filter');
  const appliedFilterCount = countActiveFilters(savedFilters, FILTER_MODAL_FIELDS);
  const filterButtonLabel = appliedFilterCount > 0 ? `${appliedFilterCount} ${baseFilterLabel}` : baseFilterLabel;
  const isFilterButtonActive = isFilterOpen || appliedFilterCount > 0;

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <Flex direction="column" h="100%" flex={1} overflow="hidden" pt={0} bg="bg.canvas">
      <Box
        overflowY="auto"
        flex={1}
        pb={6}
        sx={{
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
        }}
      >
        <Flex justify="space-between" align="center" mb={4} mt={6} px={4}>
          <Heading as="h1" fontSize="2xl" fontWeight="semibold" textAlign="left" color="text.primary">
            {t('common:hello_user', { name: user?.firstName || user?.username || '' })}
          </Heading>
          {/* Disabled — ai-design page is turned off
          <FilterButton as={RouterLink} to="/ai-design" label={t('common:more')} isActive={false} minW="auto" px={4} />
          */}
        </Flex>

        <Box px={4} mb={8}>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 6 }} spacing={4}>
            {displayedQuickActions.map((action, index) => (
              <QuickActionCard key={index} title={action.title} icon={action.icon} linkTo={action.linkTo} isNew={action.isNew} badgeLabel={action.badgeLabel} />
            ))}
          </SimpleGrid>
        </Box>

        <Flex justify="space-between" align="center" mb={2} px={4}>
          <Heading as="h1" fontSize="2xl" fontWeight="semibold" textAlign="left" color="text.primary">
            {t('common:recent_creations')} 
          </Heading>
          <FilterButton
            as={RouterLink}
            to="/generate?tab=history"
            label={t('common:see_history')}
            isActive={false}
            minW="auto"
            px={4}
          />
        </Flex>

        {/* Filters Bar */}
        <Box position="sticky" top={0} zIndex={10} bg="bg.canvas" pt={4} pb={4} px={4} w="full">
          <Flex direction="row" align="center" justify="space-between" w="full" gap={2}>
            <Flex direction="row" align="center" gap={2}>
              <FilterButton
                label={translatorCommonNS('all')}
                onClick={() => handleTypeFilterChange('')}
                isActive={!savedFilters.type}
              />
              {TYPE_FILTER_OPTIONS.map((type) => {
                const isActive = savedFilters.type === type;
                return (
                  <FilterButton
                    key={type}
                    label={translatorCommonNS(type)}
                    onClick={() => handleTypeFilterChange(type)}
                    isActive={isActive}
                  />
                );
              })}
              <Box position="relative">
                <FilterButton
                  label={translatorCommonNS('filter')}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  isActive={isFilterOpen}
                  justifyContent="space-between"
                  rightIcon={
                    <Box as="span" display="inline-flex">
                      <ChevronDownIcon size={16} />
                    </Box>
                  }
                />
                {isFilterOpen && (
                  <Box position="absolute" top="100%" left={0} zIndex={50} mt={2}>
                    {/* <FilterModal
                      onApplyFilter={handleApplyFilter}
                      onCancel={() => setIsFilterOpen(false)}
                      initialFilters={savedFilters}
                      filterFields={['models', 'time']}
                    /> */}
                    <FilterModal
                      onApplyFilter={handleApplyFilter}
                      onResetFilters={handleResetFilters}
                      onCancel={() => setIsFilterOpen(false)}
                      initialFilters={savedFilters}
                      filterFields={FILTER_MODAL_FIELDS}
                    />
                  </Box>
                )}
              </Box>
            </Flex>

            <Flex direction="row" align="center" gap={2}>
              <GridSwitcher columns={columns} onChange={handleColChange} />
            </Flex>
          </Flex>
        </Box>

        <Box pb={6} px={4}>
          {isLoading ? (
            <HomeGridSkeleton columns={columns} />
          ) : userImages.length === 0 ? (
            <Empty emptyText={t('notification:no_image_yet')} emptyDesc="" />
          ) : (
            <motion.div className={`layout-columns-${columns}`} variants={containerVariants} initial="hidden" animate="visible">
              {userImages.map((img: any, index: number) => (
                <motion.div key={`${img.attributeId}-${index}`} variants={itemVariants} className="break-inside-avoid">
                  <ImageCard
                    id={img.attributeId}
                    img={img.value}
                    matchedAttribute={img}
                    hasPublish={false}
                    hasAction={false}
                    isPublished={img.isPublished}
                    isFavorite={img.isFavorite}
                    isBookmarked={img.isBookmarked}
                    allImages={userImages}
                    currentImageIndex={index === openModalIndex ? currentIndex : undefined}
                    onNavigationPrevious={handlePrev}
                    onNavigationNext={handleNext}
                    handleOnClick={() => handleImageCardClick(index)}
                    onModalClose={handleModalClose}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </Box>
      </Box>

      <ModalTutorialVideo
              open={modalVideo}
              onClose ={ ()=>toggleModalVideo.off()}
            >
      </ModalTutorialVideo>
    </Flex>
  );
};

export default Home;



