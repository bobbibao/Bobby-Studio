import React, { useState, useCallback, useEffect } from 'react';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import { Box, Flex, Heading, Text, Button, SimpleGrid, useBreakpointValue, Tab, TabList, Tabs, Skeleton, useBoolean } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import QuickActionCard from '../ai-design/components/QuickActionCard';
import PhotoIcon from '@/shared/icons/PhotoIcon';
import ImageCard from '@/shared/card/ImageCard';
import { ChevronDownIcon, Sparkles } from 'lucide-react';
import MorphIcon from '@/components/common/MorphIcon';
import FolderIcon from '@/shared/icons/FolderIcon';
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

const CREATIVE_HOME_STYLES = [
  { id: '', labelEn: 'All Creations', labelVi: 'Tất Cả' },
  { id: 'photorealism', labelEn: 'Photorealism', labelVi: 'Siêu Thực' },
  { id: 'cinematic', labelEn: 'Cinematic', labelVi: 'Điện Ảnh' },
  { id: 'concept', labelEn: 'Concept Art', labelVi: 'Concept Art' },
] as const;
type TypeFilterSelection = string;

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
  const { t, i18n } = useTranslation();
  const isViet = i18n.language?.toLowerCase().startsWith('vi');
  const { user } = useAuthentication();
  const { columns, setColumns } = useLayoutStore();
  
  // Quick Actions Logic
  const quickActions: Array<{
    title: string;
    icon: React.ReactElement;
    linkTo: string;
    isNew?: boolean;
    badgeLabel?: string;
  }> = [
    {
      title: 'bobby_ai_studio',
      icon: <MorphIcon type="sparkle" size={22} />,
      linkTo: '/generate',
      badgeLabel: 'Core',
    },
    {
      title: 'ai_models',
      icon: <MorphIcon type="model" size={22} />,
      linkTo: '/models',
      isNew: true,
      badgeLabel: 'New',
    },
    {
      title: 'prompt_matrix',
      icon: <MorphIcon type="prompt" size={22} />,
      linkTo: '/prompts',
      badgeLabel: 'Magic',
    },
    {
      title: 'creative_lab',
      icon: <MorphIcon type="lab" size={22} />,
      linkTo: '/lab',
      badgeLabel: 'Beta',
    },
    {
      title: 'inspiration',
      icon: <PhotoIcon active={false} />,
      linkTo: '/inspiration',
    },
    {
      title: 'projects',
      icon: <FolderIcon active={false} />,
      linkTo: '/projects',
    },
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
    <Flex direction="column" h="100%" flex={1} minH={0} overflow="hidden" pt={0} bg="bg.canvas">
      <Box
        overflowY="auto"
        flex={1}
        minH={0}
        pb={6}
      >
        {/* Futuristic Hero Banner */}
        <Box px={4} pt={4} pb={2}>
          <Box
            position="relative"
            overflow="hidden"
            borderRadius="24px"
            p={{ base: 6, md: 8 }}
            bg="linear-gradient(135deg, rgba(127, 86, 217, 0.16) 0%, rgba(6, 182, 212, 0.10) 50%, rgba(15, 23, 42, 0.05) 100%)"
            border="1px solid"
            borderColor="border.subtle"
            boxShadow="0 20px 40px -15px rgba(127, 86, 217, 0.15)"
            _dark={{
              bg: 'linear-gradient(135deg, rgba(127, 86, 217, 0.22) 0%, rgba(6, 182, 212, 0.14) 45%, rgba(11, 13, 20, 0.8) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Ambient decorative glow */}
            <Box
              position="absolute"
              top="-40px"
              right="-40px"
              w="260px"
              h="260px"
              borderRadius="full"
              bg="brand.500"
              filter="blur(80px)"
              opacity={0.25}
              pointerEvents="none"
            />
            <Box
              position="absolute"
              bottom="-30px"
              left="30%"
              w="200px"
              h="200px"
              borderRadius="full"
              bg="cyan.400"
              filter="blur(70px)"
              opacity={0.15}
              pointerEvents="none"
            />

            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              gap={6}
              position="relative"
              zIndex={1}
            >
              <Box maxW="640px">
                <Flex align="center" gap={2} mb={3}>
                  <Box
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="semibold"
                    bg="rgba(127, 86, 217, 0.2)"
                    color="brand.300"
                    border="1px solid"
                    borderColor="rgba(127, 86, 217, 0.3)"
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                  >
                    <Sparkles size={13} />
                    <span>Bobby Studio Next-Gen</span>
                  </Box>
                  <Box
                    px={2.5}
                    py={1}
                    borderRadius="full"
                    fontSize="2xs"
                    fontWeight="bold"
                    letterSpacing="wider"
                    textTransform="uppercase"
                    bg="cyan.500"
                    color="white"
                  >
                    AI 2.0
                  </Box>
                </Flex>

                <Heading
                  as="h1"
                  fontSize={{ base: '2xl', md: '3xl' }}
                  fontWeight="bold"
                  letterSpacing="-0.02em"
                  color="text.primary"
                  lineHeight="1.2"
                  mb={2}
                >
                  {t('common:hello_user', { name: user?.firstName || user?.username || '' })}
                </Heading>

                <Text color="text.secondary" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.6">
                  {t('dashboard:hero_subtitle', {
                    defaultValue: 'Create ultra-photorealistic renders, transform architectural spaces, and ideate at the speed of thought with state-of-the-art AI models.',
                  })}
                </Text>
              </Box>

              <Flex gap={3} flexWrap="wrap" align="center">
                <Button
                  as={RouterLink}
                  to="/generate"
                  variant="gradient"
                  size="lg"
                  h="48px"
                  px={6}
                  borderRadius="14px"
                  leftIcon={<Sparkles size={18} />}
                  boxShadow="0 10px 25px -5px rgba(127, 86, 217, 0.45)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 14px 28px -4px rgba(127, 86, 217, 0.55)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                >
                  {t('common:start_creating', { defaultValue: 'Launch Studio' })}
                </Button>
                <Button
                  as={RouterLink}
                  to="/inspiration"
                  variant="outline"
                  size="lg"
                  h="48px"
                  px={5}
                  borderRadius="14px"
                  color="text.primary"
                  borderColor="border.subtle"
                  bg="rgba(255, 255, 255, 0.05)"
                  backdropFilter="blur(10px)"
                  _hover={{
                    bg: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'border.focus',
                    transform: 'translateY(-2px)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                >
                  {t('navigation:inspiration', { defaultValue: 'Explore Inspiration' })}
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Box>

        <Box px={4} mb={6} mt={4}>
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
              {CREATIVE_HOME_STYLES.map((style) => {
                const isActive = (savedFilters.type || '') === style.id;
                return (
                  <FilterButton
                    key={style.id}
                    label={isViet ? style.labelVi : style.labelEn}
                    onClick={() => handleTypeFilterChange(style.id)}
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



