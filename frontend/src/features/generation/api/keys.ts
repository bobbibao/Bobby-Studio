/** Query keys are scoped by user identity so cached server state can never cross accounts. */
export const generationKeys = {
  scope: (userId: string) => ['generation', userId] as const,
  catalog: (userId: string) => ['generation', userId, 'catalog'] as const,
  balance: (userId: string) => ['generation', userId, 'balance'] as const,
  snapshot: (userId: string, jobId: string) => ['generation', userId, 'snapshot', jobId] as const,
  history: (userId: string) => ['generation', userId, 'history'] as const,
};
