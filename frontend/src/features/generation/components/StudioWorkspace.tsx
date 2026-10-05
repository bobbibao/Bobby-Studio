import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Button, Flex, Skeleton, Stack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import type { StudioApi } from '../hooks/types';
import type { StudioSocket } from '../hooks/useGenerationEvents';
import { useStudioData } from '../hooks/useStudioData';
import { useStudioSession } from '../hooks/useStudioSession';
import { StudioEditor } from './StudioEditor';
import { touchSize } from './styles';

export interface StudioWorkspaceProps {
  userId: string;
  api: StudioApi;
  connect: () => StudioSocket;
  fetchImage: (url: string) => Promise<Blob>;
}

/** Loads the identity-scoped session and catalog, then mounts the editor. Failures are explicit, never faked. */
export function StudioWorkspace({ userId, api, connect, fetchImage }: StudioWorkspaceProps) {
  const { t } = useTranslation('studio');
  const session = useStudioSession(userId, () => api.createStudioSession());
  const { catalog, balance } = useStudioData(userId, api);

  const failure = session.status === 'error' ? { retry: session.retry } : catalog.isError ? { retry: () => void catalog.refetch() } : null;
  if (failure) {
    return (
      <Box p={4}>
        <Alert status="error" borderRadius="12px" alignItems="flex-start">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>{t('load.error_title')}</AlertTitle>
            <AlertDescription display="block">{t('load.error_body')}</AlertDescription>
            <Button mt={3} h={touchSize} variant="outline" onClick={failure.retry}>
              {t('common.retry')}
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }
  if (!session.session || !catalog.data) {
    return (
      <Stack p={4} spacing={4} role="status" aria-label={t('load.loading')}>
        <Skeleton h="32px" w="220px" />
        <Flex gap={4} direction={{ base: 'column', lg: 'row' }}>
          <Skeleton h="360px" flex="1" borderRadius="16px" />
          <Skeleton h="360px" flex="2" borderRadius="16px" />
        </Flex>
      </Stack>
    );
  }
  if (catalog.data.models.length === 0) {
    return (
      <Box p={4}>
        <Alert status="warning" borderRadius="12px" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <AlertTitle>{t('load.no_models_title')}</AlertTitle>
            <AlertDescription>{t('load.no_models_body')}</AlertDescription>
          </Box>
        </Alert>
      </Box>
    );
  }
  return (
    <StudioEditor
      key={session.session.sessionId}
      userId={userId}
      api={api}
      connect={connect}
      fetchImage={fetchImage}
      session={session.session}
      catalog={catalog.data}
      balance={balance.data ?? null}
    />
  );
}
