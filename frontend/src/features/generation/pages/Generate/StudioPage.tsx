import { Skeleton, Stack } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { auth } from '@/configs/firebase';
import { useAppSelector } from '@/store';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import { fetchImageBlob, generationApiClient } from '../../api/client';
import { generationKeys } from '../../api/keys';
import { StudioWorkspace } from '../../components/StudioWorkspace';
import { getBrowserStore, purgeOtherUsersStudioData } from '../../draft/browser';
import { clearStoredSession, clearUserDrafts } from '../../draft/storage';
import { connectStudioSocket } from '../../hooks/socketConnection';

/** Bobby Studio: the image-generation workspace. The feature's default export. */
export default function StudioPage() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => state.currentUser.user?.id ?? null);

  useEffect(() => {
    dispatch(setNavbarAllowBack(false));
    dispatch(setNavbarHeading('Workspace'));
  }, [dispatch]);

  // Studio state is scoped to the signed-in user: foreign data is purged, and sign-out clears this user's.
  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    purgeOtherUsersStudioData(userId);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        clearUserDrafts(getBrowserStore('local'), userId);
        clearStoredSession(getBrowserStore('session'), userId);
        queryClient.removeQueries({ queryKey: generationKeys.scope(userId) });
      }
    });
    return () => {
      unsubscribe();
      queryClient.removeQueries({ queryKey: generationKeys.scope(userId) });
    };
  }, [userId, queryClient]);

  if (!userId) {
    return (
      <Stack p={4} spacing={4} role="status">
        <Skeleton h="32px" w="220px" />
        <Skeleton h="360px" borderRadius="16px" />
      </Stack>
    );
  }
  return <StudioWorkspace key={userId} userId={userId} api={generationApiClient} connect={connectStudioSocket} fetchImage={fetchImageBlob} />;
}
