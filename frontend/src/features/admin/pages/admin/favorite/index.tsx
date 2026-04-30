import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flex, Box, HStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingPage from '@/components/LoadingPage';
import ImageCard from '@/shared/card/ImageCard';
import { API } from '@/actions/favorite';
import { useAppSelector } from '@/store';
import useLayoutStore from '@/store/layoutStore';
import Pagination from '@/components/Pagination';
import Empty from '@/components/Empty';
import { useTranslation } from 'react-i18next';
import { PaginationType } from '@/types/pagination';
import { FilterState } from '../inspiration/types/filterDropdown';
import { ChevronDownIcon } from 'lucide-react';
import FilterModal from '../inspiration/components/FilterDialog/FilterDialog';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import { FilterButton } from '@/components/FilterButton';
import { GridSwitcher } from '@/components/GridSwitcher';
import { countActiveFilters, FilterField } from '@/utils/filterUtils';

const FAVORITE_TABS = ['My Favorites', 'Liked Images'];
const FILTER_MODAL_FIELDS: FilterField[] = ['models', 'type', 'time'];

const Favorite: React.FC = () => {
  const { t } = useTranslation();

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const { columns, setColumns } = useLayoutStore();
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppSelector((state) => state.currentUser);
  const [showPagination, setShowPagination] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [allImages, setAllImages] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    pageSize: 20,
    currentPage: 1,
    pages: 0,
  });

  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);

    setAllImages([]);
    setPagination((prev: PaginationType) => ({
      ...prev,
      currentPage: 1,
      total: 0,
    }));
    setIsLoading(true);
  };

  const handleColChange = (value: number) => {
    setColumns(value);
  };

  // Reset pagination visibility only when loading starts
  useEffect(() => {
    if (isLoading) {
      setShowPagination(false);
    }
  }, [isLoading]);

  const fetchData = useCallback(
    async (pagination: PaginationType, orderBy?: 'asc' | 'desc', inputType?: string[], creationType?: string, isNextPage = false) => {
      setIsLoading(true);
      let response = null;
      if (user?.id) {
        const params: any = {
          page: pagination.currentPage,
          limit: pagination.pageSize,
          orderBy,
          inputType: inputType && inputType.length > 0 ? inputType : [],
          creationType: creationType ?? '',
        };

        if (selectedTabIndex === 0) {
          params.favorite = true;
          response = await API.getFavoriteDataImages(params);
        } else {
          params.bookmark = true;
          response = await API.getBookmarkedImages(params);
        }
      }
      if (response?.data && response.data.data) {
        const newImages = response.data.data;

        setAllImages(newImages);
        // Update pagination with cursor information from the last item
        const lastItem = newImages[newImages.length - 1];
        const hasNextPage = newImages.length === pagination.pageSize; // If we got a full page, there might be more

        setPagination((prev) => ({
          ...prev,
          total: response.data.total,
          pages: Math.ceil(response.data.total / prev.pageSize),
          lastCreatedAt: lastItem?.createdAt,
          lastId: lastItem?.attributeId,
          hasNextPage,
        }));
      } else {
        setAllImages([]);
        setPagination((prev) => ({ ...prev, total: 0, pages: 0, hasNextPage: false }));
      }
      setIsLoading(false);
    },
    [selectedTabIndex, user?.id]
  );

  const handleFilterAfterUnfavoriteUnbookmark = (attributeId?: string) => {
    if (!attributeId) return;
    setAllImages(allImages?.filter((el) => el?.attributeId !== attributeId));
  };

  useEffect(() => {
    const initialPagination = {
      ...pagination,
      currentPage: 1,
      lastCreatedAt: undefined,
      lastId: undefined,
      hasNextPage: false,
    };
    fetchData(initialPagination, 'desc', [], '', false);
    setSelectedFilters({
      models: [],
      type: '',
      time: '',
    });
  }, [selectedTabIndex]);

  const changePage = (page: number) => {
    const isNextPage = page > pagination.currentPage;
    const newPagination = { ...pagination, currentPage: page };

    // Reset cursors if going back to first page or changing filters
    if (page === 1) {
      newPagination.lastCreatedAt = undefined;
      newPagination.lastId = undefined;
    }

    setPagination(newPagination);
    setIsLoading(true);

    const orderBy = selectedFilters.time === 'oldest' ? 'asc' : 'desc';
    const inputType = (selectedFilters.models ?? []).length > 0 ? selectedFilters.models ?? [] : [];

    fetchData(newPagination, orderBy, inputType, selectedFilters.type, isNextPage);
  };
  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    models: [],
    type: '',
    time: '',
  });

  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const baseFilterLabel = translatorCommonNS('filter');
  const appliedFilterCount = countActiveFilters(selectedFilters, FILTER_MODAL_FIELDS);
  const filterButtonLabel = appliedFilterCount > 0 ? `${appliedFilterCount} ${baseFilterLabel}` : baseFilterLabel;
  const isFilterButtonActive = isFilterOpen || appliedFilterCount > 0;

  const filterRef = useRef<HTMLDivElement>(null);

  // Navigation state
  const [openModalIndex, setOpenModalIndex] = useState<number>(-1);
  const { currentIndex, handleNext, handlePrev } = useImageNavigation({
    totalImages: allImages.length,
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
    setSelectedFilters(filters);

    const orderBy = filters.time === 'oldest' ? 'asc' : 'desc';
    const inputType = (filters.models?.length ?? 0) > 0 ? filters.models ?? [] : [];

    // Reset pagination for new filters
    const resetPagination: PaginationType = {
      currentPage: 1,
      pageSize: 20,
      total: 0,
      pages: 0,
      lastCreatedAt: undefined,
      lastId: undefined,
      hasNextPage: false,
    };

    fetchData(resetPagination, orderBy, inputType, filters.type, false);

    setIsFilterOpen(false);
  };

  return (
    <>
      <Flex
        direction="column"
        minHeight="calc(100vh - 80px)"
        height="100%"
        overflowY="hidden"
        gap={4}
        px={4}
        pt={4}
        pb={0}
        mb={0}
        bg="bg.canvas"
      >
        <Flex direction="row" align="center" justify="space-between" w="full" gap={2}>
          <HStack spacing={2}>
                  {FAVORITE_TABS.map((item, index) => (
              <FilterButton
                      key={index}
                label={t(`favorite:${item.toLocaleLowerCase().replace(/ /g, '_')}`)}
                onClick={() => handleTabChange(index)}
                isActive={selectedTabIndex === index}
              />
            ))}
            <Box position="relative" ref={filterRef}>
              <FilterButton
                label={filterButtonLabel}
                  onClick={handleFilterOpen}
                isActive={isFilterButtonActive}
                justifyContent="space-between"
                rightIcon={<Box as="span" display="inline-flex"><ChevronDownIcon size={16} /></Box>}
              />
                {isFilterOpen && (
                <Box position="absolute" top="100%" left={0} zIndex={50} mt={2}>
                  <FilterModal 
                    onApplyFilter={handleApplyFilter} 
                    onCancel={handleFilterClose} 
                    initialFilters={selectedFilters} 
                    filterFields={FILTER_MODAL_FIELDS}
                  />
                </Box>
                )}
            </Box>
          </HStack>

          <GridSwitcher columns={columns} onChange={handleColChange} />
        </Flex>

        <Box flex="1" display="flex" flexDirection="column" minHeight={0} bg="bg.canvas">
          {isLoading ? (
            <LoadingPage minHeight="calc(100vh - 230px)" />
          ) : (
            <Box flex="1" pb={0} display="flex" flexDirection="column" minHeight={0}>
              <Box
                ref={scrollContainerRef}
                flex="1"
                overflowY="auto"
                minHeight={0}
                sx={{
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                  'scrollbarWidth': 'none',
                }}
                onScroll={(e) => {
                  const target = e.target as HTMLElement;
                  const scrollTop = target.scrollTop;
                  const scrollHeight = target.scrollHeight;
                  const clientHeight = target.clientHeight;
                  const threshold = 200;
                  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

                  if (distanceFromBottom < threshold) {
                    setShowPagination(true);
                  } else {
                    setShowPagination(false);
                  }
                }}
              >
                {allImages.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" h="100%">
                    <Empty emptyText={t('notification:no_image_yet')} emptyDesc="" />
                  </Flex>
                ) : (
                  <Box className={`layout-columns-${columns}`}>
                    {allImages.map((img, index) => (
                      <ImageCard
                        key={img.attributeId}
                        id={img.attributeId}
                        img={img.value}
                        isFavorite={img.isFavorite}
                        isBookmarked={img.isBookmarked}
                        matchedAttribute={img}
                        refreshData={(attributeId?: string) => handleFilterAfterUnfavoriteUnbookmark(attributeId)}
                        // Navigation props - pass to all cards, but only the one at currentIndex will be open
                        allImages={allImages}
                        currentImageIndex={index === openModalIndex ? currentIndex : undefined}
                        onNavigationPrevious={handlePrev}
                        onNavigationNext={handleNext}
                        handleOnClick={() => handleImageCardClick(index)}
                        onModalClose={handleModalClose}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <AnimatePresence mode="wait">
                {allImages.length > 0 && showPagination && (
                  <Box
                    as={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    w="100%"
                  >
                    <Box py={4} w="full">
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
            </Box>
          )}
        </Box>
      </Flex>
    </>
  );
};

export default Favorite;



