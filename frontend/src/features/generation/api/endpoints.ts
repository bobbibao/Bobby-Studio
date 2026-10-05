/** Paths relative to the API base URL (VITE_BOBBY_BE_API). */
export const GENERATION_ENDPOINTS = {
  MODELS: '/models',
  CREDIT_BALANCE: '/credits/balance',
  STUDIO_SESSIONS: '/studio-sessions',
  UPLOADS: '/uploads',
  GENERATIONS: '/generations',
  generation: (id: string) => `/generations/${encodeURIComponent(id)}`,
  cancel: (id: string) => `/generations/${encodeURIComponent(id)}/cancel`,
  retry: (id: string) => `/generations/${encodeURIComponent(id)}/retry`,
  save: (id: string) => `/generations/${encodeURIComponent(id)}/save`,
  asset: (id: string) => `/assets/${encodeURIComponent(id)}`,
} as const;
