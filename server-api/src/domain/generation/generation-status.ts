export enum GenerationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export type LegacyJobStatus =
  | 'waiting'
  | 'active'
  | 'progress'
  | 'completed'
  | 'failed';

const statusAliases: Record<string, GenerationStatus> = {
  pending: GenerationStatus.PENDING,
  waiting: GenerationStatus.QUEUED,
  queued: GenerationStatus.QUEUED,
  active: GenerationStatus.PROCESSING,
  process: GenerationStatus.PROCESSING,
  progress: GenerationStatus.PROCESSING,
  processing: GenerationStatus.PROCESSING,
  completed: GenerationStatus.COMPLETED,
  failed: GenerationStatus.FAILED,
  cancelled: GenerationStatus.CANCELLED,
  canceled: GenerationStatus.CANCELLED,
};

export function toGenerationStatus(status?: string | null): GenerationStatus {
  if (!status) {
    return GenerationStatus.PENDING;
  }

  const normalized = status.trim();
  const upper = normalized.toUpperCase();

  if (Object.values(GenerationStatus).includes(upper as GenerationStatus)) {
    return upper as GenerationStatus;
  }

  return statusAliases[normalized.toLowerCase()] ?? GenerationStatus.PENDING;
}

export function toLegacyJobStatus(status: GenerationStatus | string): LegacyJobStatus {
  switch (toGenerationStatus(status)) {
    case GenerationStatus.PENDING:
    case GenerationStatus.QUEUED:
      return 'waiting';
    case GenerationStatus.PROCESSING:
      return 'progress';
    case GenerationStatus.COMPLETED:
      return 'completed';
    case GenerationStatus.FAILED:
    case GenerationStatus.CANCELLED:
      return 'failed';
    default:
      return 'waiting';
  }
}

export function isTerminalGenerationStatus(status: GenerationStatus | string): boolean {
  const normalized = toGenerationStatus(status);
  return [
    GenerationStatus.COMPLETED,
    GenerationStatus.FAILED,
    GenerationStatus.CANCELLED,
  ].includes(normalized);
}
