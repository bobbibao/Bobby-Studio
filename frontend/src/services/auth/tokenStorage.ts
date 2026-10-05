import { auth } from '@/configs/firebase';

/**
 * The only credential is the Firebase ID token of the signed-in user. There is no stored or
 * substitute token: without a signed-in user the API correctly answers 401.
 */
export async function getToken(forceRefresh = false): Promise<string | null> {
  await auth.authStateReady();
  return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null;
}

export async function refreshToken(): Promise<string | null> {
  try {
    return await getToken(true);
  } catch {
    return null;
  }
}
