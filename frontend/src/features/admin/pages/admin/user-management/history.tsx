import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Button,
  HStack,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ViewIcon } from '@chakra-ui/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { useUserImageHistory, useUserImageHistoryDetail, GetUserImageHistoryQueryParams } from '@/hooks/useUserHistory';
import { useUserById } from '@/hooks/useUser';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import { FilterButton } from '@/components/FilterButton';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import ImageCard from '@/shared/card/ImageCard';
import { getUserImageHistoryDetail } from '@/features/user';
import { imageConstants } from '@/constants/image.constants';

const UserHistory: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper function to get initial params from URL
  const getInitialParams = (): GetUserImageHistoryQueryParams => {
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sort: searchParams.get('sort') || 'createdAt:desc',
      inputType: searchParams.get('inputType') as 'edit' | 'generate' || 'generate',
      method: searchParams.get('method') || undefined,
      resolution: searchParams.get('resolution') || undefined,
      aspectRatio: searchParams.get('aspectRatio') || undefined,
      selectedEditingModels: searchParams.get('selectedEditingModels') || undefined,
    };
  };
  // Color mode values - following style guide
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const subtleTextColor = useColorModeValue('zinc.400', 'zinc.500');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');
  const tableBg = useColorModeValue('white', 'transparent');
  const hoverBg = useColorModeValue('zinc.50', 'zinc.800');

  // Update URL params when state changes
  const updateUrlParams = (newParams: GetUserImageHistoryQueryParams) => {
    const urlParams = new URLSearchParams();
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        urlParams.set(key, String(value));
      }
    });

    setSearchParams(urlParams);
  };

  const [params, setParams] = useState<GetUserImageHistoryQueryParams>(getInitialParams);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Update URL when params change
  useEffect(() => {
    updateUrlParams(params);
  }, [params]);

  const { data, isLoading, error } = useUserImageHistory(userId!, params);
  const { data: itemDetail, isLoading: isDetailLoading } = useUserImageHistoryDetail(selectedItemId || '');
  const { data: userData } = useUserById(userId);
  const detailQueries = useQueries({
    queries: viewMode === 'grid' && data?.data
      ? data.data.map((item) => ({
        queryKey: ['user-history-detail', item.id],
        queryFn: () => getUserImageHistoryDetail(item.id),
        enabled: !!item.id && viewMode === 'grid',
        staleTime: 30000,
      }))
      : [],
  });
  const gridItems = useMemo(
    () => detailQueries.map((query) => query.data).filter(Boolean),
    [detailQueries]
  );
  const isGridLoading = viewMode === 'grid' && detailQueries.some((query) => query.isLoading);

  // Log when detail data is fetched
  useEffect(() => {
    if (itemDetail && selectedItemId) {
      console.log('Fetched item detail from API:', itemDetail);
      console.log('API endpoint called: GET /admin/detail-history/' + selectedItemId);
    }
  }, [itemDetail, selectedItemId]);

  // Helper function to get model label from value
  const getModelLabel = (value: string, inputType: string) => {
    const models = inputType === 'edit' ? imageConstants.editModel : imageConstants.generateModel;
    const model = models.find(m => m.value === value);
    return model ? model.label : value;
  };
  const getModelLabelsEdit = (values: string[] | undefined) => {
    if (!values) return '-';
    return values.map(value => getModelLabel(value, 'edit')).join(', ');
  }

  const handleInputTypeChange = (inputType: 'edit' | 'generate' | '') => {
    setParams(prev => ({
      ...prev,
      inputType: inputType || undefined,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  // Function to fetch item detail from API endpoint @Get('detail-history/:id')
  const handleFetchItemDetail = (itemId: string) => {
    console.log('Calling API: GET /admin/detail-history/' + itemId);
    setSelectedItemId(itemId);
  };


  if (!userId) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          User ID is required
        </Alert>
      </Box>
    );
  }

  return (
    <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
      {/* Header with Back Button, Filters, and Email */}
      <Box position="relative">
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <HStack spacing={2}>
            <Button
              leftIcon={<ChevronLeftIcon />}
              variant="outline"
              borderRadius="lg"
              h={9}
              fontSize="sm"
              fontWeight="normal"
              borderColor={borderColor}
              onClick={() => navigate('/user-management')}
            >
              {t('usermanagement:back')}
            </Button>
            <FilterButton
              label={t('common:all')}
              onClick={() => handleInputTypeChange('')}
              isActive={!params.inputType}
            />
            <FilterButton
              label={t('usermanagement:generate')}
              onClick={() => handleInputTypeChange('generate')}
              isActive={params.inputType === 'generate'}
            />
            <FilterButton
              label={t('usermanagement:edit')}
              onClick={() => handleInputTypeChange('edit')}
              isActive={params.inputType === 'edit'}
            />
            <ViewSwitcher view={viewMode} onChange={setViewMode} />
          </HStack>
          {userData && (
            <Text fontSize="md" fontWeight="medium" color={textColor}>
              {userData.email}
            </Text>
          )}
        </Flex>
      </Box>

      {/* Content Area */}
      <Box flex="1" overflowY="auto" pb={0}>

        {/* Error State */}
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {t('usermanagement:failed_to_load_users')}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading || isGridLoading ? (
          <Flex justify="center" align="center" minH="300px">
            <Spinner size="xl" color="brand.600" />
          </Flex>
        ) : (
          <>
            {/* History Table */}
            {data && (
            <>
                {viewMode === 'list' ? (
                  <TableContainer bg={tableBg} borderRadius="lg">
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                            textAlign="center"
                          >
                            {t('usermanagement:type')}
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                          >
                            <Menu>
                              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                                {t('usermanagement:method')}
                              </MenuButton>
                              <MenuList>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, method: undefined, page: 1 }))}
                                  bg={!params.method ? 'blue.400' : 'transparent'}
                                  _hover={{ bg: 'gray.700' }}
                                >
                                  {t('usermanagement:all_methods')}
                                </MenuItem>
                                {(() => {
                                  const methods = params.inputType === 'edit' 
                                    ? imageConstants.editingMethods 
                                    : params.inputType === 'generate' 
                                    ? imageConstants.generationMethods 
                                    : [...imageConstants.editingMethods, ...imageConstants.generationMethods];
                                  return methods.map((method) => (
                                    <MenuItem 
                                      key={method.value} 
                                      onClick={() => setParams(prev => ({ ...prev, method: method.value, page: 1 }))}
                                      bg={params.method === method.value ? 'blue.400' : 'transparent'}
                                      _hover={{ bg: 'gray.700' }}
                                    >
                                      {t(`usermanagement:${method.value}`)}
                                    </MenuItem>
                                  ));
                                })()}
                              </MenuList>
                            </Menu>
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                          >
                            <Menu>
                              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                                {t('usermanagement:resolution')}
                              </MenuButton>
                              <MenuList>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, resolution: undefined, page: 1 }))}
                                  bg={!params.resolution ? 'blue.400' : 'transparent'}
                                  _hover={{ bg: 'gray.700' }}
                                >
                                  {t('usermanagement:all_resolutions')}
                                </MenuItem>
                                {imageConstants.resolutionOptions.map((res) => (
                                  <MenuItem 
                                    key={res} 
                                    onClick={() => setParams(prev => ({ ...prev, resolution: res, page: 1 }))}
                                    bg={params.resolution === res ? 'blue.400' : 'transparent'}
                                    _hover={{ bg: 'gray.700' }}
                                  >
                                    {res}
                                  </MenuItem>
                                ))}
                              </MenuList>
                            </Menu>
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                          >
                            <Menu>
                              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                                {t('usermanagement:aspect_ratio')}
                              </MenuButton>
                              <MenuList>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, aspectRatio: undefined, page: 1 }))}
                                  bg={!params.aspectRatio ? 'blue.400' : 'transparent'}
                                  _hover={{ bg: 'gray.700' }}
                                >
                                  {t('usermanagement:all_aspect_ratios')}
                                </MenuItem>
                                {imageConstants.aspect.map((aspect) => (
                                  <MenuItem 
                                    key={aspect} 
                                    onClick={() => setParams(prev => ({ ...prev, aspectRatio: aspect, page: 1 }))}
                                    bg={params.aspectRatio === aspect ? 'blue.400' : 'transparent'}
                                    _hover={{ bg: 'gray.700' }}
                                  >
                                    {aspect}
                                  </MenuItem>
                                ))}
                              </MenuList>
                            </Menu>
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                          >
                            <Menu>
                              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                                {t('usermanagement:model')}
                              </MenuButton>
                              <MenuList>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, selectedEditingModels: undefined, page: 1 }))}
                                  bg={!params.selectedEditingModels ? 'blue.400' : 'transparent'}
                                  _hover={!params.selectedEditingModels ? { bg: 'blue.400' } : { bg: 'gray.700' }}
                                >
                                  {t('usermanagement:all_models')}
                                </MenuItem>
                                {(() => {
                                  const models = params.inputType === 'edit' 
                                    ? imageConstants.editModel 
                                    : params.inputType === 'generate' 
                                    ? imageConstants.generateModel 
                                    : [...imageConstants.editModel, ...imageConstants.generateModel];
                                  return models.map((model) => (
                                    <MenuItem 
                                      key={model.value} 
                                      onClick={() => setParams(prev => ({ ...prev, selectedEditingModels: model.value, page: 1 }))}
                                      bg={params.selectedEditingModels === model.value ? 'blue.400' : 'transparent'}
                                      _hover={params.selectedEditingModels === model.value ? { bg: 'blue.400' } : { bg: 'gray.700' }}
                                    >
                                      {model.label}
                                    </MenuItem>
                                  ));
                                })()}
                              </MenuList>
                            </Menu>
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                          >
                            <Menu>
                              <MenuButton 
                                _hover={{ bg: 'gray.700' }}
                                as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm"
                              >
                                {t('usermanagement:created_at')}
                              </MenuButton>
                              <MenuList>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, sort: 'desc' }))}
                                  bg={params.sort === 'desc' ? 'blue.400' : 'transparent'}
                                  _hover={{ bg: 'gray.700' }}
                                >
                                  {t('usermanagement:newest')}
                                </MenuItem>
                                <MenuItem 
                                  onClick={() => setParams(prev => ({ ...prev, sort: 'asc' }))}
                                  bg={params.sort === 'asc' ? 'blue.400' : 'transparent'}
                                  _hover={{ bg: 'gray.700' }}
                                >
                                  {t('usermanagement:oldest')}
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Th>
                          <Th
                            borderColor={borderColor}
                            borderBottomWidth="1px"
                            textTransform="none"
                            fontSize="sm"
                            fontWeight="normal"
                            color={mutedTextColor}
                            py={4}
                            textAlign="center"
                          >
                            {t('usermanagement:actions')}
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {data.data.length > 0 ? (
                          data.data.map((item, index) => {
                            const isLastRow = index === data.data.length - 1;
                            return (
                              <Tr 
                                key={item.id}
                            onClick={() => navigate(`/user-management/history-detail/${item.id}`)}
                                _hover={{ bg: hoverBg }}
                            cursor="pointer"
                                transition="background 0.2s"
                              >
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  textAlign="center"
                                  py={4}
                                >
                                  <Badge colorScheme={item.inputType === 'edit' ? 'blue' : 'green'}>
                                    {t(`usermanagement:${item.inputType}`)}
                                  </Badge>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  py={4}
                                >
                                  <Text fontSize="sm" color={mutedTextColor}>
                                    {t(`usermanagement:${item.method}`) || '-'}
                                  </Text>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  py={4}
                                >
                                  <Text fontSize="sm" color={mutedTextColor}>
                                    {item.resolution || '-'}
                                  </Text>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  py={4}
                                >
                                  <Text fontSize="sm" color={mutedTextColor}>
                                    {item.aspectRatio || '-'}
                                  </Text>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  py={4}
                                >
                                  <Text fontSize="sm" color={mutedTextColor}>
                                    {item.inputType === "generate" ? getModelLabel(item.modelName, item.inputType) : getModelLabelsEdit(item.modelName, item.inputType)}
                                  </Text>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  py={4}
                                >
                                  <Text fontSize="sm" color={mutedTextColor}>
                                    {new Date(item.createdAt).toLocaleString()}
                                  </Text>
                                </Td>
                                <Td
                                  borderColor={borderColor}
                                  borderBottomWidth={isLastRow ? '0' : '1px'}
                                  textAlign="center"
                                  py={4}
                                >
                                  <Button
                                    size="sm"
                                    leftIcon={<ViewIcon />}
                                    variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                      handleFetchItemDetail(item.id);
                                      navigate(`/user-management/history-detail/${item.id}`);
                                    }}
                                    isLoading={selectedItemId === item.id && isDetailLoading}
                                  >
                                    {t('usermanagement:view_detail')}
                                  </Button>
                                </Td>
                              </Tr>
                            );
                          })
                        ) : (
                          <Tr>
                            <Td colSpan={7} borderBottomWidth="0">
                              <Flex direction="column" align="center" justify="center" py={10}>
                                <Text fontSize="md" fontWeight="medium" color={mutedTextColor} mb={2}>
                                  {t('usermanagement:no_history_found')}
                                </Text>
                                <Text fontSize="sm" color={subtleTextColor}>
                                  {t('usermanagement:adjust_search_filter')}
                                </Text>
                              </Flex>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (
                  <>
                    {gridItems.length > 0 ? (
                      <div className="layout-columns-3">
                        {gridItems.map((item) => {
                          const imagePath = Array.isArray(item.imagePath) ? item.imagePath[0] : item.imagePath;
                          const referencePath = Array.isArray(item.referenceImages) ? item.referenceImages[0] : item.referenceImages;
                          const resolvedPath = imagePath || referencePath || '';
                          if (!resolvedPath) {
                            return null;
                          }
                          return (
                            <div key={item.id} className="break-inside-avoid">
                              <ImageCard
                                id={item.id}
                                img={{ key: item.id, path: resolvedPath }}
                                handleOnClick={() => navigate(`/user-management/history-detail/${item.id}`)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Flex direction="column" align="center" justify="center" py={10}>
                        <Text fontSize="md" fontWeight="medium" color={mutedTextColor} mb={2}>
                          {t('usermanagement:no_history_found')}
                        </Text>
                        <Text fontSize="sm" color={subtleTextColor}>
                          {t('usermanagement:adjust_search_filter')}
                        </Text>
                      </Flex>
                    )}
                  </>
                )}

              {/* Pagination */}
              {data && (() => {
                const limit = params.limit || 10;
                const totalPages = Math.ceil(data.total / limit);
                return totalPages > 1 && (
                  <Flex justify="space-between" align="center" mt={6}>
                    <Text fontSize="sm" color={mutedTextColor}>
                      {t('usermanagement:showing_results', {
                        from: ((params.page || 1) - 1) * limit + 1,
                        to: Math.min((params.page || 1) * limit, data.total),
                        total: data.total
                      })}
                    </Text>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange((params.page || 1) - 1)}
                        isDisabled={(params.page || 1) <= 1 || isDetailLoading}
                      >
                        {t('usermanagement:previous')}
                      </Button>
                      <Text fontSize="sm" color={mutedTextColor} px={2}>
                        {t('usermanagement:page_of', { 
                          current: params.page || 1, 
                          total: totalPages
                        })}
                      </Text>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange((params.page || 1) + 1)}
                        isDisabled={(params.page || 1) >= totalPages || isDetailLoading}
                      >
                        {t('usermanagement:next')}
                      </Button>
                    </HStack>
                  </Flex>
                );
              })()}
            </>
          )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default UserHistory;



