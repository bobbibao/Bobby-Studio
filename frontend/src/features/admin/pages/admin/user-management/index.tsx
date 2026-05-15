import React, { useMemo,useEffect, useState } from 'react';
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
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spinner,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Switch,
  NumberInput,
  NumberInputField,
  IconButton,
  HStack,
  Alert,
  AlertIcon,
  useColorModeValue,
  Menu,
  MenuList,
  MenuItem,
  MenuButton,
} from '@chakra-ui/react';
import { SearchIcon, EditIcon, DownloadIcon, TriangleUpIcon, TriangleDownIcon, ViewIcon } from '@chakra-ui/icons';
import { useQueries } from '@tanstack/react-query';
import { useUsers, useUpdateUser } from '@/hooks/useUser';
import { getAllUsers, GetUsersQueryParams, UserListItem, UpdateUserDto, downloadUsersCSV } from '@/features/user';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilterButton } from '@/components/FilterButton';
import { ChevronDownIcon } from 'lucide-react';

// Sortable fields type
type SortField = 'email' | 'role' | 'isActive' | 'emailVerified' | 'isAdmin' | 'freeCredit' | 'paidCredit' | 'lastLogin' | 'createdAt';
type SortItem = {
  field: string;
  order: 'asc' | 'desc';
};


const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Color mode values - following style guide
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const subtleTextColor = useColorModeValue('zinc.400', 'zinc.500');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');
  const tableBg = useColorModeValue('white', 'transparent');
  const hoverBg = useColorModeValue('zinc.50', 'zinc.800');

  // Helper function to get initial params from URL
  const getInitialParams = (): GetUsersQueryParams => {
    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      search: searchParams.get('search') || '',
      filter: searchParams.get('filter') as GetUsersQueryParams['filter'] || undefined,
      sort: searchParams.get('sort') || 'createdAt:desc',
      role: searchParams.get('role') as GetUsersQueryParams['role'] || undefined,
      isActive: searchParams.get('isActive') as GetUsersQueryParams['isActive'] || undefined,
      emailVerified: searchParams.get('emailVerified') as GetUsersQueryParams['emailVerified'] || undefined,
      isAdmin: searchParams.get('isAdmin') as GetUsersQueryParams['isAdmin'] || undefined,
    };
  };

  // Helper function to get initial sorts from URL
  const getInitialSorts = (): SortItem[] => {
    const sortParam = searchParams.get('sort');
    if (!sortParam) return [];
    
    return sortParam.split(',').map(item => {
      const [field, order] = item.split(':');
      return { field, order: order as 'asc' | 'desc' };
    }).filter(item => item.field && item.order);
  };

  // Query parameters state
  const [params, setParams] = useState<GetUsersQueryParams>(getInitialParams);

  const [sorts, setSorts] = useState<SortItem[]>(getInitialSorts);

  // Update URL params when state changes
  const updateUrlParams = (newParams: GetUsersQueryParams) => {
    const urlParams = new URLSearchParams();
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        urlParams.set(key, String(value));
      }
    });

    setSearchParams(urlParams);
  };

  // Handle column sort click
  const handleColumnSort = (field: string) => {
    setSorts(prev => {
      const existingIndex = prev.findIndex(s => s.field === field);
      if (existingIndex === -1) {
        // No sort exists, add as 'asc'
        return [...prev, { field, order: 'asc' }];
      } else {
        const currentOrder = prev[existingIndex].order;
        if (currentOrder === 'asc') {
          // Change to 'desc'
          return prev.map(s => s.field === field ? { ...s, order: 'desc' } : s);
        } else {
          // Remove the sort (was 'desc')
          return prev.filter(s => s.field !== field);
        }
      }
    });
  };
  const buildSortString = (sortItems: SortItem[]) => {
    return sortItems.map(s => `${s.field}:${s.order}`).join(',');
  };


  useEffect(() => {
    const sortString = buildSortString(sorts);
    const newParams = { 
      ...params, 
      sort: sortString,
      page: 1 
    };
    setParams(newParams);
    updateUrlParams(newParams);
  }, [sorts]);

  // Update URL when params change (but not when triggered by sorts)
  useEffect(() => {
    updateUrlParams(params);
  }, [params]);

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    const sortItem = sorts.find(s => s.field === field);
    if (!sortItem) {
      return null;
    }
    return sortItem.order === 'asc' 
      ? <TriangleUpIcon ml={1} boxSize={3} />
      : <TriangleDownIcon ml={1} boxSize={3} />;
  };

  // Fetch users with the hook
  const { data, isLoading, error, isFetching } = useUsers(params);

  const filterCountQueries = useQueries({
    queries: [
      {
        queryKey: ['users', 'count', 'all'],
        queryFn: () => getAllUsers({ page: 1, limit: 1 }),
        staleTime: 30000,
      },
      {
        queryKey: ['users', 'count', 'free'],
        queryFn: () => getAllUsers({ page: 1, limit: 1, filter: 'free' }),
        staleTime: 30000,
      },
      {
        queryKey: ['users', 'count', 'basic'],
        queryFn: () => getAllUsers({ page: 1, limit: 1, filter: 'basic' }),
        staleTime: 30000,
      },
      {
        queryKey: ['users', 'count', 'pro'],
        queryFn: () => getAllUsers({ page: 1, limit: 1, filter: 'pro' }),
        staleTime: 30000,
      },
      {
        queryKey: ['users', 'count', 'team'],
        queryFn: () => getAllUsers({ page: 1, limit: 1, filter: 'team' }),
        staleTime: 30000,
      },
    ],
  });

  const filterCounts = useMemo(() => {
    const formatCount = (value?: number) => (value === undefined ? '—' : value.toLocaleString());
    return {
      all: formatCount(filterCountQueries[0]?.data?.total),
      free: formatCount(filterCountQueries[1]?.data?.total),
      basic: formatCount(filterCountQueries[2]?.data?.total),
      pro: formatCount(filterCountQueries[3]?.data?.total),
      team: formatCount(filterCountQueries[4]?.data?.total),
    };
  }, [filterCountQueries]);
  
  // Update user mutation
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  // Modal state for editing user
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserDto>({});

  // Handle search input with debounce
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Simple debounce - update params after user stops typing
    setTimeout(() => {
      setParams(prev => ({ ...prev, search: value, page: 1 }));
    }, 500);
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as GetUsersQueryParams['filter'];
    setParams(prev => ({ ...prev, filter: value || undefined, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  // Open edit modal
  const handleEditClick = (user: UserListItem) => {
    setSelectedUser(user);
    setEditForm({
      freeCredit: user.freeCredit,
      paidCredit: user.paidCredit,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
    onOpen();
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!selectedUser) return;

    // Only send fields that have changed
    const updates: UpdateUserDto = {};
    if (editForm.freeCredit !== selectedUser.freeCredit) {
      updates.freeCredit = editForm.freeCredit;
    }
    if (editForm.paidCredit !== selectedUser.paidCredit) {
      updates.paidCredit = editForm.paidCredit;
    }
    if (editForm.isAdmin !== selectedUser.isAdmin) {
      updates.isAdmin = editForm.isAdmin;
    }
    if (editForm.isActive !== selectedUser.isActive) {
      updates.isActive = editForm.isActive;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    updateUser(
      { userId: selectedUser.id, data: updates },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('usermanagement:never');
    return new Date(dateString).toLocaleDateString();
  };

  

  return (
    <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
      {/* Header with Filters and Actions */}
      <Box position="relative">
        <Flex gap={4} align="center" wrap="wrap">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color={subtleTextColor} />
            </InputLeftElement>
            <Input
              placeholder={t('usermanagement:search_by_email')}
              value={searchInput}
              onChange={handleSearchChange}
              h={9}
              borderRadius="lg"
            />
          </InputGroup>

          {/* <HStack spacing={2}>
            <FilterButton
              label={`${t('usermanagement:all')} ${filterCounts.all}`}
              onClick={() => setParams(prev => ({ ...prev, filter: undefined, page: 1 }))}
              isActive={!params.filter}
            />
            <FilterButton
              label={`Free ${filterCounts.free}`}
              onClick={() => setParams(prev => ({ ...prev, filter: 'free', page: 1 }))}
              isActive={params.filter === 'free'}
            />
            <FilterButton
              label={`Basic ${filterCounts.basic}`}
              onClick={() => setParams(prev => ({ ...prev, filter: 'basic', page: 1 }))}
              isActive={params.filter === 'basic'}
            />
            <FilterButton
              label={`Pro ${filterCounts.pro}`}
              onClick={() => setParams(prev => ({ ...prev, filter: 'pro', page: 1 }))}
              isActive={params.filter === 'pro'}
            />
            <FilterButton
              label={`Team ${filterCounts.team}`}
              onClick={() => setParams(prev => ({ ...prev, filter: 'team', page: 1 }))}
              isActive={params.filter === 'team'}
            />
          </HStack> */}

          <Button
            variant="outline"
            borderRadius="lg"
            h={9}
            onClick={() => downloadUsersCSV(params)}
            fontWeight="normal"
            borderColor={borderColor}
            leftIcon={<DownloadIcon />}
            ml="auto"
          >
            CSV
          </Button>
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
        {isLoading ? (
          <Flex justify="center" align="center" minH="300px">
            <Spinner size="xl" color="brand.600" />
          </Flex>
        ) : (
          <>
            {/* Users Table */}
            <TableContainer bg={tableBg} borderRadius="lg">
            <Table variant="simple" size="md">
              <Thead>
                <Tr>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'email') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'email') ? textColor : mutedTextColor}
                    py={4}
                    px={4}
                    cursor="pointer"
                    // onClick={() => handleColumnSort('email')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    {t('usermanagement:email')}
                    <SortIcon field="email" />
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'role') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'role') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    // onClick={() => handleColumnSort('role')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    <Menu>
                      <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                        {t('usermanagement:role')}
                        <SortIcon field="role" />
                      </MenuButton>
                      <MenuList>
                        <MenuItem 
                        bg={!params.role ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, role: undefined, page: 1 }));}}>
                          {t('usermanagement:all')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.role === 'free' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, role: 'free', page: 1 }));}}>
                          Free
                        </MenuItem>
                        <MenuItem 
                        bg={params.role === 'basic' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, role: 'basic', page: 1 }));}}>
                          Basic
                        </MenuItem>
                        <MenuItem 
                        bg={params.role === 'pro' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, role: 'pro', page: 1 }));}}>
                          Pro
                        </MenuItem>
                        <MenuItem 
                        bg={params.role === 'team' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, role: 'team', page: 1 }));}}>
                          Team
                        </MenuItem>
                        
                      </MenuList>
                    </Menu>
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'isActive') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'isActive') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    // onClick={() => handleColumnSort('isActive')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    <Menu>
                      <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                      {t('usermanagement:status')}
                      <SortIcon field="isActive" />
                      </MenuButton>

                      <MenuList>
                        <MenuItem 
                        bg={!params.isActive ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isActive: undefined, page: 1 }));}}>
                          {t('usermanagement:all')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.isActive === 'true' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isActive: 'true', page: 1 }));}}>
                          {t('usermanagement:active')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.isActive === 'false' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isActive: 'false', page: 1 }));}}>
                          {t('usermanagement:inactive')}
                        </MenuItem>
                      </MenuList>
                    </Menu>

                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'emailVerified') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'emailVerified') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    // onClick={() => handleColumnSort('emailVerified')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    <Menu>
                      <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                          {t('usermanagement:email_verified')}
                        <SortIcon field="emailVerified" />
                      </MenuButton>

                      <MenuList>
                        <MenuItem
                        bg={!params.emailVerified ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, emailVerified: undefined, page: 1 }));}}>
                            {t('usermanagement:all')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.emailVerified === 'true' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, emailVerified: 'true', page: 1 }));}}>
                          {t('usermanagement:verified')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.emailVerified === 'false' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, emailVerified: 'false', page: 1 }));}}>
                          {t('usermanagement:unverified')}
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'isAdmin') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'isAdmin') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    // onClick={() => handleColumnSort('isAdmin','desc')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    

                      <Menu>
                      <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" size="sm">
                        {t('usermanagement:admin_status')}
                    <SortIcon field="isAdmin" />
                      </MenuButton>

                      <MenuList>
                        <MenuItem
                        bg={!params.isAdmin ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isAdmin: undefined, page: 1 }));}}>
                            {t('usermanagement:all')}
                        </MenuItem>
                        <MenuItem 
                        bg={params.isAdmin === 'true' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isAdmin: 'true', page: 1 }));}}>
                          {t('usermanagement:admin')}
                        </MenuItem>
                        <MenuItem
                        bg={params.isAdmin === 'false' ? 'blue.400' : 'transparent'}
                        _hover={{ bg: 'gray.700' }}
                        onClick={() => {setParams(prev => ({ ...prev, isAdmin: 'false', page: 1 }));}}>
                          {t('usermanagement:not_admin')}
                        </MenuItem>
                      </MenuList>
                    </Menu>

                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'freeCredit') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'freeCredit') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    onClick={() => handleColumnSort('freeCredit')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    {t('usermanagement:free_credit')}
                    <SortIcon field="freeCredit" />
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'paidCredit') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'paidCredit') ? textColor : mutedTextColor}
                    py={4}
                    textAlign="center"
                    cursor="pointer"
                    onClick={() => handleColumnSort('paidCredit')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    {t('usermanagement:paid_credit')}
                    <SortIcon field="paidCredit" />
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'lastLogin') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'lastLogin') ? textColor : mutedTextColor}
                    py={4}
                    cursor="pointer"
                    onClick={() => handleColumnSort('lastLogin')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    {t('usermanagement:last_login')}
                    <SortIcon field="lastLogin" />
                  </Th>
                  <Th
                    borderColor={borderColor}
                    borderBottomWidth="1px"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight={sorts.some(s => s.field === 'createdAt') ? 'semibold' : 'normal'}
                    color={sorts.some(s => s.field === 'createdAt') ? textColor : mutedTextColor}
                    py={4}
                    cursor="pointer"
                    onClick={() => handleColumnSort('createdAt')}
                    _hover={{ color: textColor }}
                    transition="color 0.2s"
                  >
                    {t('usermanagement:created_at')}
                    <SortIcon field="createdAt" />
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
                    {t('usermanagement:history')}
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
                    {t('usermanagement:edit')}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {data?.users && data.users.length > 0 ? (
                  data.users.map((user, index) => {
                    const isLastRow = index === data.users.length - 1;
                    return (
                      <Tr 
                        key={user.id}
                        onClick={() => navigate(`/user-management/history/${user.id}`)}
                        _hover={{ bg: hoverBg }}
                        cursor="pointer"
                        transition="background 0.2s"
                      >
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          py={4}
                          px={4}
                        >
                          <Text fontWeight="medium" fontSize="sm" color={textColor}>
                            {user.email}
                          </Text>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Badge colorScheme="purple">
                            {user.role}
                          </Badge>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Badge colorScheme={user.isActive ? 'green' : 'red'}>
                            {user.isActive ? t('usermanagement:active') : t('usermanagement:inactive')}
                          </Badge>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Text fontSize="sm" color={user.emailVerified ? 'green.500' : mutedTextColor}>
                            {user.emailVerified ? t('usermanagement:yes') : t('usermanagement:no')}
                          </Text>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Text fontSize="sm" color={mutedTextColor}>
                            {user.isAdmin ? t('usermanagement:admin') : t('usermanagement:member')}
                          </Text>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Text fontSize="sm" color={mutedTextColor}>
                            <Text as="span" fontWeight="semibold" color={textColor}>
                              {user.usedFreeCredit}
                            </Text>
                            {' / '}
                            {user.freeCredit}
                          </Text>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <Text fontSize="sm" color={mutedTextColor}>
                            <Text as="span" fontWeight="semibold" color={textColor}>
                              {user.usedPaidCredit}
                            </Text>
                            {' / '}
                            {user.paidCredit}
                          </Text>
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          py={4}
                        >
                          <Text fontSize="sm" color={mutedTextColor}>
                            {formatDate(user.lastLogin)}
                          </Text>
                        </Td>
                        
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          py={4}
                        >
                          <Text fontSize="sm" color={mutedTextColor}>
                            {formatDate(user.createdAt)}
                          </Text>
                        </Td>

                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <IconButton
                            aria-label={t('usermanagement:view_history')}
                            icon={<ViewIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/user-management/history/${user.id}`);
                            }}
                          />
                        </Td>
                        <Td 
                          borderColor={borderColor}
                          borderBottomWidth={isLastRow ? '0' : '1px'}
                          textAlign="center"
                          py={4}
                        >
                          <IconButton
                            aria-label={t('usermanagement:edit_user_aria')}
                            icon={<EditIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditClick(user);
                            }}
                          />
                        </Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={11} borderBottomWidth="0">
                      <Flex direction="column" align="center" justify="center" py={10}>
                        <Text fontSize="md" fontWeight="medium" color={mutedTextColor} mb={2}>
                          {t('usermanagement:no_results_found')}
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

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <Flex justify="space-between" align="center" mt={6}>
              <Text fontSize="sm" color={mutedTextColor}>
                {t('usermanagement:showing_results', {
                  from: (data.page - 1) * data.limit + 1,
                  to: Math.min(data.page * data.limit, data.total),
                  total: data.total
                })}
              </Text>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(params.page! - 1)}
                  isDisabled={params.page === 1 || isFetching}
                >
                  {t('usermanagement:previous')}
                </Button>
                <Text fontSize="sm" color={mutedTextColor} px={2}>
                  {t('usermanagement:page_of', { current: data.page, total: data.totalPages })}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(params.page! + 1)}
                  isDisabled={params.page === data.totalPages || isFetching}
                >
                  {t('usermanagement:next')}
                </Button>
              </HStack>
            </Flex>
          )}
          </>
        )}

      {/* Edit User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="lg" fontWeight="semibold" color={textColor}>
            {t('usermanagement:edit_user')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser && (
              <Flex direction="column" gap={5}>
                {/* User Email Display */}
                <Box
                  bg={hoverBg}
                  borderRadius="md"
                  px={4}
                  py={3}
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Text fontSize="xs" color={mutedTextColor} mb={1}>
                    {t('usermanagement:email')}
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    {selectedUser.email}
                  </Text>
                </Box>

                {/* Free Credits Display */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" color={textColor} mb={2}>
                    {t('usermanagement:free_credit')} 
                  </Text>
                
                  <NumberInput
                    value={editForm.freeCredit}
                    onChange={(_, valueAsNumber) =>
                      setEditForm(prev => ({ ...prev, freeCredit: valueAsNumber }))
                    }
                    min={0}
                  >
                    <NumberInputField />
                  </NumberInput>

                  <Text fontSize="xs" color={mutedTextColor} mt={1.5}  textAlign={"right"} >
                      {selectedUser.usedFreeCredit} / {selectedUser.freeCredit} {t('usermanagement:used')}
                  </Text>

                  
                </Box>

                {/* Paid Credits */}
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color={textColor} mb={2}>
                    <Flex direction="row" alignItems="baseline" gap={"8px"}>
                      <Text fontSize="sm" fontWeight="medium" color={textColor}>
                      {t('usermanagement:paid_credit')}
                      </Text>
                    </Flex>

                    
                  </FormLabel>
                  <NumberInput
                    value={editForm.paidCredit}
                    onChange={(_, valueAsNumber) =>
                      setEditForm(prev => ({ ...prev, paidCredit: valueAsNumber }))
                    }
                    min={0}
                  >
                    <NumberInputField />
                  </NumberInput>
                  <Text mt={1.5} fontSize="xs" color={mutedTextColor} textAlign={"right"}>
                      {`${selectedUser.usedPaidCredit} / ${selectedUser.paidCredit} ${t('usermanagement:used')}`}  
                  </Text>
                </FormControl>

                {/* Admin Status Toggle */}
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="sm" fontWeight="medium" color={textColor} mb={0}>
                    {t('usermanagement:admin_status')}
                  </FormLabel>
                  <Switch
                    colorScheme="brand"
                    isChecked={editForm.isAdmin}
                    onChange={(e) =>
                      setEditForm(prev => ({ ...prev, isAdmin: e.target.checked }))
                    }
                  />
                </FormControl>

                {/* Account Active Toggle */}
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <FormLabel fontSize="sm" fontWeight="medium" color={textColor} mb={0}>
                    {t('usermanagement:account_active')}
                  </FormLabel>
                  <Switch
                    colorScheme="brand"
                    isChecked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm(prev => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                </FormControl>
              </Flex>
            )}
          </ModalBody>

          <ModalFooter gap={3}>
            <Button variant="outline" onClick={onClose} isDisabled={isUpdating}>
              {t('usermanagement:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isUpdating}
              loadingText={t('usermanagement:updating')}
            >
              {t('usermanagement:save_changes')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      </Box>
    </Box>
  );
};

export default UserManagement;



