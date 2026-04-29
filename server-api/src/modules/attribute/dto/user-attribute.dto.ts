export class UserAttributeDto {
  userId: string;
  attributeId: string;
  attributeVersion?: string;
  attributeType?: string;
}

export class UserAttributesDto {
  userId: string;
  attributeId: string;
}

export class UserAttributeEntity<V, A> {
  userId: string;
  attributeId?: string;
  version?: string;
  value?: V;
  actions?: A;
  createdAt?: string;
  type?: string;
  projectAttributeId?: string;
  projectTitle?: string;
  isPublished?: boolean;
}

export class HistoryJobDto {
  jobId: string;
  requestId?: string; // For batch grouping of multiple images
  creationType: string;
  inputType: string;
  imageKey: string;
  uploadImage?: string;
  path?: string;
  thumbnail?: string;
  selectedStyle?: string; // Deprecated: use selectedSeason instead
  selectedSeason?: string;
  selectedDaytime?: string;
  seed?: string;
  inputValue: number;
  styleValue: number;
  creativityValue: number;
  // Upscale-specific fields
  upscaleValue?: number;
  hdrValue?: number;
  resemblanceValue?: number;
  fractalityValue?: number;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  createdAt: string;
  isPublished: boolean;
  isFavorite: boolean;
  isBookmarked: boolean;
  userId: string;
  version?: string;
  numImages?: number;
  method?: string;
  selectedModels?: string[];
  modelId?: string;
  batchEditId?: string | null; // Batch ID for grouping related edits
  editVersionNumber?: number; // Version number within the batch (1-based)
}
