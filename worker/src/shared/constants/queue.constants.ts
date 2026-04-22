export const QUEUE_NAMES = {
  IMAGE_GENERATION: 'image-generation',
  IMAGE_POST_PROCESSING: 'image-post-processing',
} as const;

export const REDIS_KEYS = {
  JOB_STATUS: (jobId: string) => `job:${jobId}:metadata`,
  USER_JOBS: (userId: string) => `user:${userId}:jobs`,
} as const;
