import { Badge, Box, Button, Flex, List, ListItem, Menu, MenuButton, MenuList, Portal, Text, useColorModeValue } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ClockIcon from '../icons/ClockIcon';
import AddIcon from '../icons/AddIcon';
import ImagePlaceholderIcon from '../icons/ImagePlacholderIcon';
import { generationApiClient, generationKeys } from '@/features/generation/api';
import { TERMINAL_JOB_STATUSES, type GenerationSnapshot, type JobStatus } from '@/features/generation/contracts';
import { formatDateTime } from '@/features/generation/components/format';
import { selectCurrentUser } from '@/selectors/user';

const RECENT_LIMIT = 5;
const ACTIVE_REFRESH_MS = 4000;

const STATUS_COLOR: Record<JobStatus, string> = {
  PENDING: 'gray',
  QUEUED: 'gray',
  PROCESSING: 'blue',
  COMPLETED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
};

const hasActiveJob = (items: GenerationSnapshot[] | undefined): boolean =>
  Boolean(items?.some((job) => !TERMINAL_JOB_STATUSES.includes(job.status)));

/** Recent generations from the server, the same source as the studio's own history. */
const HistoryJobMenu: React.FC = () => {
  const { t, i18n } = useTranslation(['studio', 'common']);
  const navigate = useNavigate();
  const { user } = useSelector(selectCurrentUser);
  const userId = user?.id;

  const recent = useQuery({
    queryKey: [...generationKeys.history(userId ?? ''), 'recent'],
    queryFn: () => generationApiClient.listGenerations({ limit: RECENT_LIMIT }),
    enabled: Boolean(userId),
    staleTime: 10_000,
    refetchInterval: (query) => (hasActiveJob(query.state.data?.items) ? ACTIVE_REFRESH_MS : false),
  });
  const items = recent.data?.items ?? [];

  const menuBg = useColorModeValue('white', 'zinc.950');
  const menuBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const buttonBg = useColorModeValue('zinc.100', 'zinc.800');
  const buttonHoverBg = useColorModeValue('zinc.200', 'zinc.700');
  const itemHoverBg = useColorModeValue('zinc.50', 'zinc.900');
  const listBorderColor = useColorModeValue('zinc.200', 'zinc.700');

  const openStudio = () => navigate('/generate');

  return (
    <Menu isLazy onOpen={() => void recent.refetch()}>
      <MenuButton
        as={Button}
        aria-label={t('common:history')}
        variant="unstyled"
        px={0}
        py={0}
        height="100%"
        width="100%"
        minW="unset"
        minH="unset"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="text.primary"
        _hover={{}}
        _active={{}}
      >
        <Box display="flex" alignItems="center" justifyContent="center">
          <ClockIcon />
        </Box>
      </MenuButton>

      <Portal>
        <MenuList maxW="300px" minW="300px" borderRadius="lg" bg={menuBg} borderColor={menuBorderColor} borderWidth="1px" boxShadow="xl" zIndex={99999} p={0}>
          <Flex justify="space-between" align="center" px={4} py={3}>
            <Text fontSize="lg" fontWeight="semibold" color="text.primary">
              {t('studio:history.title')}
            </Text>
            <Button onClick={openStudio} variant="ghost" size="sm" fontWeight="medium" color="text.muted" bg={buttonBg} px={2} py={1} borderRadius="md" _hover={{ bg: buttonHoverBg, color: 'text.primary' }}>
              {t('studio:history.open_studio')}
            </Button>
          </Flex>

          <List spacing={0} borderTopWidth="1px" borderTopColor={listBorderColor} role="status" aria-live="polite">
            {recent.isError ? (
              <Text color="text.muted" fontSize="sm" p={4}>
                {t('studio:history.load_error')}
              </Text>
            ) : items.length > 0 ? (
              items.map((job) => (
                <ListItem
                  key={job.id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  px={4}
                  py={3}
                  gap={3}
                  cursor="pointer"
                  onClick={openStudio}
                  _hover={{ bg: itemHoverBg }}
                >
                  <Flex gap={3} align="center" minW={0}>
                    <Box w="28px" h="28px" display="flex" alignItems="center" justifyContent="center" borderRadius="md" bg="brand.600" flexShrink={0}>
                      <ImagePlaceholderIcon width="12px" height="12px" color="white" />
                    </Box>
                    <Flex direction="column" minW={0}>
                      <Text color="text.primary" fontSize="sm" noOfLines={1}>
                        {t(`studio:history.mode_${job.mode}`)}
                        {job.intent === 'preview' ? ` · ${t('studio:history.preview')}` : ''}
                      </Text>
                      <Text color="text.muted" fontSize="xs">
                        {formatDateTime(job.completedAt ?? job.createdAt, i18n.language)}
                      </Text>
                    </Flex>
                  </Flex>
                  <Badge colorScheme={STATUS_COLOR[job.status]} flexShrink={0}>
                    {t(`studio:history.status_${job.status}`)}
                  </Badge>
                </ListItem>
              ))
            ) : (
              <Flex direction="column" justify="center" align="center" p={6} gap={3}>
                <Button w="68px" h="68px" borderRadius="full" bg={buttonBg} _hover={{ bg: buttonHoverBg }} onClick={openStudio} aria-label={t('studio:history.open_studio')}>
                  <AddIcon width="36px" height="36px" />
                </Button>
                <Text color="text.muted" fontSize="sm" fontWeight="medium" textAlign="center">
                  {t('studio:history.empty')}
                </Text>
              </Flex>
            )}
          </List>
        </MenuList>
      </Portal>
    </Menu>
  );
};

export default HistoryJobMenu;
