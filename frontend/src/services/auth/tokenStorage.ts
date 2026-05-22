import { LOCAL_BYPASS_API_TOKEN, LOCAL_BYPASS_USER_ID } from '@/config/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/config/auth';
import { auth } from '@/configs/firebase';

export async function getToken(forceRefresh = false): Promise<string | null> {
  const firebaseToken = await auth.currentUser?.getIdToken(forceRefresh);

  if (firebaseToken) {
    return firebaseToken;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveToken(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function refreshToken(): Promise<string | null> {
  try {
    const token = await getToken(true);

    if (token) {
      saveToken(token);
    }

    return token;
  } catch {
    clearToken();
    return null;
  }
}

export function getLocalBypassHeaders() {
  return {
    bypass_api_token: LOCAL_BYPASS_API_TOKEN,
    bypass_api_user_id: LOCAL_BYPASS_USER_ID,
  };
}

