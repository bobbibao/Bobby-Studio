import { Box, Flex, Tab, TabList, Tabs, VStack, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import { useAuthentication } from '@/hooks/useAuthentication';
import ImageCard from '@/shared/card/ImageCard';
import useLayoutStore from '@/store/layoutStore';
import Pagination from '@/components/Pagination';
import { API } from '@/actions/favorite';
import LoadingPage from '@/components/LoadingPage';
import Empty from '@/components/Empty';
import { useTranslation } from 'react-i18next';
import FilterModal from '@/features/admin/pages/admin/inspiration/components/FilterDialog/FilterDialog';
import { ChevronDownIcon, Sparkles } from 'lucide-react';
import { InputTypeEnum } from '@/constants/attribute-enum';
import { FilterState } from '@/features/admin/pages/admin/inspiration/types/filterDropdown';
import { PaginationType } from '@/types/pagination';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import CustomDragPreview from '@/features/admin/pages/admin/project/components/CustomDragPreview';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import { countActiveFilters, FilterField } from '@/utils/filterUtils';

const TABS_LIST = ['all', InputTypeEnum.LINE_DRAWING, InputTypeEnum.TEXT_PROMPT, InputTypeEnum.REFERENCE, InputTypeEnum.MODEL_3D];
const CREATIVE_CATEGORIES = [
  { id: '', labelEn: 'All Creations', labelVi: 'Tất Cả Tác Phẩm' },
  { id: 'photorealism', labelEn: 'Photorealism', labelVi: 'Siêu Thực' },
  { id: 'cinematic', labelEn: 'Cinematic 8K', labelVi: 'Điện Ảnh 8K' },
  { id: 'concept', labelEn: 'Concept Art', labelVi: 'Concept Art' },
  { id: 'scifi', labelEn: 'Sci-Fi & Cyber', labelVi: 'Viễn Tưởng' },
] as const;
type TypeFilterSelection = string;
const FILTER_MODAL_FIELDS: FilterField[] = ['models', 'time'];

const Inspiration: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isViet = i18n.language?.toLowerCase().startsWith('vi');
  const location = useLocation();
  const dispatch = useDispatch();
  const { columns, setColumns } = useLayoutStore();

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [showPagination, setShowPagination] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [savedFilters, setSavedFilters] = useState<FilterState>({
    models: [],
    type: '',
    time: '',
  });
  const baseFilterLabel = translatorCommonNS('filter');
  const appliedFilterCount = countActiveFilters(savedFilters, FILTER_MODAL_FIELDS);
  const filterButtonLabel = appliedFilterCount > 0 ? `${appliedFilterCount} ${baseFilterLabel}` : baseFilterLabel;
  const isFilterButtonActive = isFilterOpen || appliedFilterCount > 0;

  const { user } = useAuthentication();
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    pageSize: 20,
    currentPage: 1,
    pages: 0,
  });
  const [userImages, setUserImages] = useState<any>([]);

  // Navigation state
  const [openModalIndex, setOpenModalIndex] = useState<number>(-1);
  const { currentIndex, handleNext, handlePrev } = useImageNavigation({
    totalImages: userImages.length,
    initialIndex: openModalIndex,
    onIndexChange: (newIndex) => {
      setOpenModalIndex(newIndex);
    },
  });

  const handleImageCardClick = (index: number) => {
    setOpenModalIndex(index);
  };

  const handleModalClose = () => {
    setOpenModalIndex(-1);
  };

  const handleFilterOpen = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterClose = () => {
    setIsFilterOpen(false);
  };

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
    fetchData(selectedTabIndex, updatedPagination, orderBy, mergedFilters.type || undefined, inputType);
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
    fetchData(selectedTabIndex, updatedPagination, 'desc');
    setIsFilterOpen(false);
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
    fetchData(selectedTabIndex, updatedPagination, orderBy, nextType || undefined, inputType);
  };

  const fetchData = useCallback(
    async (
      selectedTabIndex: number,
      paginationParam: PaginationType,
      orderBy: 'asc' | 'desc' = 'desc',
      creationType?: string,
      inputType?: string[]
    ) => {
      setIsLoading(true);
      const params: any = {
        page: paginationParam.currentPage,
        limit: paginationParam.pageSize,
        orderBy,
        creationType,
        inputType,
      };
      const isAdminView = location.pathname.includes('inspiration-admin');
      if (isAdminView && user?.isAdmin) {
        params.isPublished = false;
      } else if (!isAdminView) {
        // Regular Inspiration - always filter to published only
        params.isPublished = true;
      } else {
        // Non-admin trying to access admin view - redirect gracefully
        setUserImages([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await API.getDataImages(params);
        let data = [];
        if (response.data) {
          data = response.data.data;
          const updatedPagination = {
            ...paginationParam,
            total: response.data.total,
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
    [location.pathname, user?.isAdmin]
  );

  // Track which user we've fetched configuration for to prevent duplicate calls
  // Initial setup effect - runs once on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');

    dispatch(setNavbarAllowBack(!!typeParam));
    dispatch(setNavbarHeading(typeParam || 'Inspiration'));

    return () => {
      dispatch(setNavbarAllowBack(false));
    };
  }, [dispatch, location.search]);

  // Initial data fetch effect - runs once after component mounts and when location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');

    const initialPagination = {
      total: 0,
      pageSize: 20,
      currentPage: 1,
      pages: 0,
    };

    const orderBy = savedFilters?.time === 'oldest' ? 'asc' : 'desc';
    if (typeParam) {
      const tabs = JSON.parse(JSON.stringify(TABS_LIST)).toLocaleString().toLowerCase().split(',');
      const tabIndex = tabs.indexOf(typeParam.toLocaleLowerCase());

      setSelectedTabIndex(tabIndex >= 0 ? tabIndex : 0);
      fetchData(tabIndex, initialPagination, orderBy);
    } else {
      setSelectedTabIndex(0);
      fetchData(0, initialPagination, orderBy);
    }
  }, [location.search, fetchData, savedFilters?.time]);

  const handleTabChange = (index: number) => {
    const newPagination = {
      ...pagination,
      currentPage: 1,
    };
    setSelectedTabIndex(index);
    setPagination(newPagination);
    const orderBy = savedFilters?.time === 'oldest' ? 'asc' : 'desc';
    const inputType = Array.isArray(savedFilters.models) && savedFilters.models.length > 0 ? savedFilters.models : [];
    const creationType = savedFilters.type || undefined;

    fetchData(index, newPagination, orderBy, creationType, inputType);
  };

  // Reset pagination visibility only when loading starts
  useEffect(() => {
    if (isLoading) {
      setShowPagination(false);
    }
  }, [isLoading]);

  const handleColChange = (value: number) => {
    setColumns(value);
  };

  const changePage = (page: number) => {
    const newPagination = {
      ...pagination,
      currentPage: page,
    };
    setPagination(newPagination);
    const orderBy = savedFilters?.time === 'oldest' ? 'asc' : 'desc';
    const inputType = Array.isArray(savedFilters.models) && savedFilters.models.length > 0 ? savedFilters.models : [];
    const creationType = savedFilters.type || undefined;

    fetchData(selectedTabIndex, newPagination, orderBy, creationType, inputType);
  };

  // Ensure selectedTabIndex has a value before rendering the Tabs
  if (selectedTabIndex === -1) {
    return null; // Return nothing until the tab index is set
  }

  return (
    <>
      <CustomDragPreview />
      <VStack spacing={0} h="full" w="full" minH={0} flex={1} bg="bg.canvas">
        {/* Futuristic Inspiration Hero Banner */}
        <Box px={6} pt={5} pb={3} w="full">
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
                  ✦ Neural Community Gallery
                </Box>
              </Flex>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" letterSpacing="-0.02em" color="text.primary">
                {isViet ? 'Khám Phá Cảm Hứng Sáng Tạo' : 'Inspiration & Community Showcase'}
              </Heading>
              <Text fontSize="xs" color="text.muted" mt={0.5}>
                {isViet 
                  ? 'Tuyển tập các tác phẩm thế hệ mới từ hệ thống AI Studio Bobby, sẵn sàng sao chép prompt và remix.' 
                  : 'Curated neural generations, hyper-realistic renders, and prompt recipes ready to remix.'}
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* Creative Filter Bar */}
        <Flex direction="row" align="center" justify="space-between" w="full" px={6} py={2} gap={3} flexWrap="wrap">
          <Flex direction="row" align="center" gap={2} flexWrap="wrap">
            {CREATIVE_CATEGORIES.map((cat) => {
              const isActive = (savedFilters.type || '') === cat.id;
              return (
                <FilterButton
                  key={cat.id}
                  label={isViet ? cat.labelVi : cat.labelEn}
                  onClick={() => handleTypeFilterChange(cat.id)}
                  isActive={isActive}
                />
              );
            })}

            <Box position="relative" ref={filterRef}>
              <FilterButton
                label={filterButtonLabel}
                onClick={handleFilterOpen}
                isActive={isFilterButtonActive}
                justifyContent="space-between"
                rightIcon={
                  <Box as="span" display="inline-flex">
                    <ChevronDownIcon size={16} />
                  </Box>
                }
              />
              {isFilterOpen && (
                <Box position="absolute" top="100%" left={0} zIndex={50} mt={2}>
                  <FilterModal
                    onApplyFilter={handleApplyFilter}
                    onResetFilters={handleResetFilters}
                    onCancel={handleFilterClose}
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

        <Box height="full" width="full" pt={4} px={4} display="flex" flexDirection="column" minHeight={0} bg="bg.canvas">
          <Box
            ref={scrollContainerRef}
            flex="1"
            overflowY="auto"
            minHeight={0}
            onScroll={(e) => {
              const target = e.target as HTMLElement;
              const scrollTop = target.scrollTop;
              const scrollHeight = target.scrollHeight;
              const clientHeight = target.clientHeight;
              const threshold = 200; // Show/hide pagination when within 200px of bottom
              const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

              if (distanceFromBottom < threshold) {
                setShowPagination(true);
              } else {
                setShowPagination(false);
              }
            }}
          >
            {isLoading ? (
              <LoadingPage minHeight="calc(100vh - 230px)" />
            ) : userImages.length === 0 ? (
              <Flex direction="column" align="center" justify="center" h="100%">
                <Empty emptyText={t('notification:no_image_yet')} emptyDesc="" />
              </Flex>
            ) : (
              <motion.div
                className={`layout-columns-${columns}`}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
                initial="hidden"
                animate="visible"
              >
                {userImages.map((img: any, index: number) => (
                  <motion.div
                    key={`${img.attributeId}-${index}`}
                    variants={{
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
                    }}
                    className="break-inside-avoid"
                  >
                    <ImageCard
                      id={img.attributeId}
                      img={img.value}
                      matchedAttribute={img}
                      hasPublish={false}
                      hasAction={false}
                      handleDelCallback={() => {
                        const orderBy = savedFilters?.time === 'oldest' ? 'asc' : 'desc';
                        const inputType =
                          Array.isArray(savedFilters.models) && savedFilters.models.length > 0 ? savedFilters.models : [];
                        const creationType = savedFilters.type || undefined;
                        fetchData(selectedTabIndex, pagination, orderBy, creationType, inputType);
                      }}
                      isPublished={img.isPublished}
                      isFavorite={img.isFavorite}
                      isBookmarked={img.isBookmarked}
                      // Navigation props - pass to all cards, but only the one at currentIndex will be open
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

        <AnimatePresence mode="wait">
          {!isLoading && userImages.length > 0 && showPagination && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{ width: '100%' }}
            >
              <Box p={4} w="full">
                <Pagination
                  total={pagination.total}
                  pages={pagination.pages}
                  pageSize={pagination.pageSize}
                  currentPage={pagination.currentPage}
                  className={''}
                  changePage={(page: number) => changePage(page)}
                />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </VStack>
    </>
  );
};

export default Inspiration;



