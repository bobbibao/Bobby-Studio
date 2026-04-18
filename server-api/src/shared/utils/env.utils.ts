export const isEnvValueSet = (value?: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const placeholders = new Set([
    'asd',
    'asdasd',
    'changeme',
    'replace_me',
    'your_stripe_secret_key',
    'your_jwt_secret',
    'your_private_key_here',
    'your_firebase_private_key',
    'your_private_key',
  ]);

  if (placeholders.has(lower)) return false;
  if (lower.startsWith('your_')) return false;

  return true;
};

export const isNumericEnv = (value?: string | null): boolean => {
  if (!isEnvValueSet(value)) return false;
  return Number.isFinite(Number(value));
};

export const isRedisConfigured = (): boolean => {
  return isEnvValueSet(process.env.REDIS_HOST) && isNumericEnv(process.env.REDIS_PORT);
};

export const isDatabaseConfigured = (): boolean => {
  return isEnvValueSet(process.env.DATABASE_URL);
};
