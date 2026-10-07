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

  const menuBg = useColorModeValue('rgba(255, 255, 255, 0.96)', 'rgba(15, 16, 24, 0.96)');
  const menuBorderColor = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const buttonBg = useColorModeValue('zinc.100', 'zinc.800');
  const buttonHoverBg = useColorModeValue('zinc.200', 'zinc.700');
  const itemHoverBg = useColorModeValue('zinc.100', 'zinc.850');
  const listBorderColor = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');

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
        <MenuList
          maxW="320px"
          minW="320px"
          borderRadius="18px"
          bg={menuBg}
          backdropFilter="blur(16px)"
          borderColor={menuBorderColor}
          borderWidth="1px"
          boxShadow="0 20px 40px -10px rgba(0,0,0,0.35)"
          zIndex={99999}
          p={0}
        >
          <Flex justify="space-between" align="center" px={4} py={3}>
            <Text fontSize="md" fontWeight="600" color="text.primary">
              {t('studio:history.title')}
            </Text>
            <Button onClick={openStudio} variant="ghost" size="xs" fontWeight="500" color="brand.500" bg={buttonBg} px={2.5} py={1} borderRadius="lg" _hover={{ bg: buttonHoverBg, color: 'brand.600' }}>
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
                  py={2.5}
                  gap={3}
                  cursor="pointer"
                  onClick={openStudio}
                  _hover={{ bg: itemHoverBg }}
                  transition="background-color 0.15s"
                >
                  <Flex gap={3} align="center" minW={0}>
                    <Box w="30px" h="30px" display="flex" alignItems="center" justifyContent="center" borderRadius="lg" bg="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)" flexShrink={0} boxShadow="0 2px 8px rgba(127, 86, 217, 0.3)">
                      <ImagePlaceholderIcon width="13px" height="13px" color="white" />
                    </Box>
                    <Flex direction="column" minW={0}>
                      <Text color="text.primary" fontSize="xs" fontWeight="500" noOfLines={1}>
                        {t(`studio:history.mode_${job.mode}`)}
                        {job.intent === 'preview' ? ` · ${t('studio:history.preview')}` : ''}
                      </Text>
                      <Text color="text.muted" fontSize="11px">
                        {formatDateTime(job.completedAt ?? job.createdAt, i18n.language)}
                      </Text>
                    </Flex>
                  </Flex>
                  <Badge colorScheme={STATUS_COLOR[job.status]} borderRadius="md" fontSize="10px" px={1.5} py={0.5} flexShrink={0}>
                    {t(`studio:history.status_${job.status}`)}
                  </Badge>
                </ListItem>
              ))
            ) : (
              <Flex direction="column" justify="center" align="center" p={6} gap={2}>
                <Button w="56px" h="56px" borderRadius="full" bg={buttonBg} _hover={{ bg: buttonHoverBg, transform: 'scale(1.05)' }} transition="all 0.2s" onClick={openStudio} aria-label={t('studio:history.open_studio')}>
                  <AddIcon width="28px" height="28px" />
                </Button>
                <Text color="text.muted" fontSize="xs" fontWeight="500" textAlign="center" mt={1}>
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
