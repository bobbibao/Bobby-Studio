# API & Auth Architecture for React

## API Service Layer

### 1. Axios Client Setup

```typescript
// services/api/client.ts
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});
```

### 2. Request/Response Interceptor Pattern

```typescript
// services/api/auth.interceptor.ts
import { getToken, refreshToken } from './tokenStorage';

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Retry on 401 with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### 3. Feature API Layer (OffersApiClient Example)

```typescript
// features/offers/api/client.ts
import { apiClient } from '@/services/api/client';
import { OFFERS_ENDPOINTS } from './endpoints';
import { Response, PaginatedResponse } from '@/shared/types/api';
import { Offer, CreateOfferDTO } from '../types';

export class OffersApiClient {
  async getOffers(page: number, pageSize: number, search?: string, status?: string) {
    const query = buildQueryString({ page, page_size: pageSize, search, status });
    const response = await apiClient.get<PaginatedResponse<Offer>>(
      `${OFFERS_ENDPOINTS.GET_OFFERS}${query}`
    );
    return response.data;
  }

  async getOffer(id: number) {
    const response = await apiClient.get<Response<Offer>>(
      OFFERS_ENDPOINTS.GET_OFFER(id)
    );
    return response.data.payload;
  }

  async createOffer(data: CreateOfferDTO) {
    const response = await apiClient.post<Response<Offer>>(
      OFFERS_ENDPOINTS.CREATE_OFFER,
      data
    );
    return response.data.payload;
  }

  async updateOffer(id: number, data: CreateOfferDTO) {
    const response = await apiClient.put<Response<Offer>>(
      OFFERS_ENDPOINTS.UPDATE_OFFER(id),
      data
    );
    return response.data.payload;
  }

  async deleteOffer(id: number) {
    await apiClient.delete(OFFERS_ENDPOINTS.DELETE_OFFER(id));
  }
}

export const offersApiClient = new OffersApiClient();
```

### 4. Feature Endpoints

```typescript
// features/offers/api/endpoints.ts
export const OFFERS_ENDPOINTS = {
  GET_OFFERS: '/offers',
  GET_OFFER: (id: number) => `/offer/${id}`,
  CREATE_OFFER: '/offer',
  UPDATE_OFFER: (id: number) => `/offer/${id}`,
  DELETE_OFFER: (id: number) => `/offer/${id}`,
  BULK_DELETE: '/offers/bulk',
  COPY_OFFER: (id: number) => `/offer/${id}/copy`,
};
```

### 5. React Query Hooks Layer

```typescript
// features/offers/api/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApiClient } from './client';

const OFFERS_QUERY_KEY = 'offers';

export function useOffers(page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, page, pageSize, search],
    queryFn: () => offersApiClient.getOffers(page, pageSize, search),
  });
}

export function useOfferDetail(id: number | undefined) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'detail', id],
    queryFn: () => offersApiClient.getOffer(id!),
    enabled: !!id,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => offersApiClient.createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] });
    },
  });
}

export function useUpdateOffer(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => offersApiClient.updateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => offersApiClient.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] });
    },
  });
}
```

---

## JWT / Auth Flow

### 1. Token Storage

```typescript
// services/auth/tokenStorage.ts
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function refreshToken(): Promise<string | null> {
  try {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) return null;

    const response = await apiClient.post('/refresh', { refresh_token: refresh });
    const newToken = response.data.access_token;
    saveToken(newToken, refresh);
    return newToken;
  } catch (error) {
    clearToken();
    return null;
  }
}
```

### 2. Auth Store (Zustand)

```typescript
// services/auth/auth.store.ts
import create from 'zustand';
import { getToken, saveToken, clearToken } from './tokenStorage';
import { apiClient } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: !!getToken(),
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/login', { email, password });
      const { access_token, refresh_token, user } = response.data;
      
      saveToken(access_token, refresh_token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed',
        isLoading: false 
      });
    }
  },
  
  logout: async () => {
    try {
      await apiClient.get('/logout');
    } finally {
      clearToken();
      set({ user: null, isAuthenticated: false });
    }
  },
  
  verifyAuth: async () => {
    if (!getToken()) {
      set({ isAuthenticated: false });
      return;
    }
    
    try {
      const response = await apiClient.get('/verify');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      clearToken();
      set({ isAuthenticated: false, user: null });
    }
  },
  
  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));
```

### 3. Protected Route Wrapper

```typescript
// routes/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/services/auth/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return <LoadingPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return children;
}
```

### 4. Auth Flow Diagram

```
┌─────────────────┐
│   Login Form    │
└────────┬────────┘
         │
         v
┌─────────────────────────────┐
│  useAuthStore.login()       │
│  POST /login                │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Save tokens + user         │
│  Update auth store          │
└────────┬────────────────────┘
         │
         v
┌──────────────────────────────┐
│  Request interceptor:        │
│  Attach Bearer token         │
└──────────────────────────────┘
         
         
│ Response Error 401 │
└──────┬──────────────┘
       │
       v
┌─────────────────────────────┐
│  refreshToken()             │
│  POST /refresh              │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Save new token             │
│  Retry original request     │
└─────────────────────────────┘
```

### 5. App Initialization (useEffect)

```typescript
// app/App.tsx
useEffect(() => {
  // Verify auth on mount
  useAuthStore.getState().verifyAuth();
}, []);
```

---

## Error Handling Strategy

| Status | Action | User Flow |
|--------|--------|-----------|
| **401 Unauthorized** | Refresh token, retry | Silent (if refresh succeeds) |
| **403 Forbidden** | Show error toast | Deny access, show message |
| **404 Not Found** | Show error message | Inform user resource missing |
| **500+ Server Error** | Retry with backoff | Show error, option to retry |
| **Network Error** | Show offline message | Indicate connection issue |

---

## API Response Mapping

```typescript
// types/api.ts
export interface Response<T> {
  error: boolean;
  payload?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  error: boolean;
  payload?: {
    current_page: number;
    items: T[];
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  message?: string;
}

// Utility for mapping
export function mapResponse<T>(response: Response<T>): T {
  if (response.error) throw new Error(response.message || 'API Error');
  return response.payload!;
}
```

---

## Query String Builder

```typescript
// shared/utils/api.ts
export function buildQueryString(params: Record<string, any>): string {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => 
      Array.isArray(value)
        ? value.map(v => `${key}=${encodeURIComponent(v)}`).join('&')
        : `${key}=${encodeURIComponent(value)}`
    )
    .join('&');
  
  return query ? `?${query}` : '';
}
```
