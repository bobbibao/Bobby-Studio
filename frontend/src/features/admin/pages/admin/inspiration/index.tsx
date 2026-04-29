import { Box, Flex, Tab, TabList, Tabs, VStack } from '@chakra-ui/react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import { useApi } from '@/services';
import { useAuthentication } from '@/hooks/useAuthentication';
import ImageCard from '@/shared/card/ImageCard';
import useLayoutStore from '@/store/layoutStore';
import Pagination from '@/components/Pagination';
import { API } from '@/actions/favorite';
import LoadingPage from '@/components/LoadingPage';
import Empty from '@/components/Empty';
import { useTranslation } from 'react-i18next';
import FilterModal from '@/features/admin/pages/admin/inspiration/components/FilterDialog/FilterDialog';
import { ChevronDownIcon } from 'lucide-react';
import { InputTypeEnum } from '@/constants/attribute-enum';
import { FilterState } from '@/types/filterDropdown';
import { PaginationType } from '@/types/pagination';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import CustomDragPreview from '@/features/admin/pages/admin/project/components/CustomDragPreview';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import { countActiveFilters, FilterField } from '@/utils/filterUtils';

const TABS_LIST = ['all', InputTypeEnum.LINE_DRAWING, InputTypeEnum.TEXT_PROMPT, InputTypeEnum.REFERENCE, InputTypeEnum.MODEL_3D];
const TYPE_FILTER_OPTIONS = ['exterior', 'interior'] as const;
type TypeFilterOption = (typeof TYPE_FILTER_OPTIONS)[number];
type TypeFilterSelection = TypeFilterOption | '';
const FILTER_MODAL_FIELDS: FilterField[] = ['models', 'time'];

const Inspiration: React.FC = () => {
  const { t } = useTranslation();
  const { fetchUserConfiguration } = useApi();
  const location = useLocation();
  const dispatch = useDispatch();
  const { columns, setColumns } = useLayoutStore();

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(-1);
  const [isPublishMethod, setIsPublishMethod] = useState<boolean>(false);
  const [isDeleteMethod, setIsDeleteMethod] = useState<boolean>(false);
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
  const configuredUserRef = useRef<string | null>(null);
  const isLoadingConfigRef = useRef<boolean>(false);

  // Create a stable reference to the fetch function
  const fetchUserConfigRef = useRef(fetchUserConfiguration);
  fetchUserConfigRef.current = fetchUserConfiguration;

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

  // User configuration effect - only call once per user
  useEffect(() => {
    const fetchUserConfig = async (userId: string) => {
      if (isLoadingConfigRef.current) return; // Prevent concurrent calls

      isLoadingConfigRef.current = true;
      try {
        const response = await fetchUserConfigRef.current(userId);
        const { isPublishMethod, isDeleteMethod } = response;
        setIsPublishMethod(isPublishMethod);
        setIsDeleteMethod(isDeleteMethod);
        configuredUserRef.current = userId;
      } catch (error) {
        console.error('Error fetching user configuration:', error);
        // Set default values on error
        setIsPublishMethod(false);
        setIsDeleteMethod(false);
      } finally {
        isLoadingConfigRef.current = false;
      }
    };

    if (user?.id && user.id !== configuredUserRef.current && !isLoadingConfigRef.current) {
      fetchUserConfig(user.id);
    }
  }, [user?.id]);

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
      <VStack spacing={0} h="full" w="full" bg="bg.canvas">
        <Tabs index={selectedTabIndex} onChange={handleTabChange} variant="unstyled" px={4} pt={4} pb={0} w="full">
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
        </Tabs>

        <Box height="full" width="full" pt={4} px={4} display="flex" flexDirection="column" minHeight={0} bg="bg.canvas">
          <Box
            ref={scrollContainerRef}
            flex="1"
            overflowY="auto"
            minHeight={0}
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
            }}
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
                      hasPublish={isPublishMethod}
                      hasAction={isDeleteMethod}
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
            <Box
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              w="100%"
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
            </Box>
          )}
        </AnimatePresence>
      </VStack>
    </>
  );
};

export default Inspiration;



