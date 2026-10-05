import { PlanType } from '@prisma/client';
import { CatalogModel, GenerationQuality, GenerationSize } from '../../application/generation/contracts';
import { ImageProviderId, ImageProviderMode } from '../../config/runtime-config';

/**
 * Catalog definitions shipped with the application. They are copied into PostgreSQL by
 * syncCatalog() (create-if-missing); the database rows are what the API serves.
 *
 * Capabilities mirror the worker's provider adapters (worker/src/providers/*). Simulated entries
 * use Bobby simulator model ids, which are not vendor model ids. Live entries are served only when
 * the active profile is live with the same provider.
 */
export const CATALOG_VERSION = 1;

export interface CatalogDefinition {
  id: string;
  provider: ImageProviderId;
  mode: ImageProviderMode;
  displayName: string;
  description: string;
  sortOrder: number;
  capabilities: CatalogModel['capabilities'];
  limits: CatalogModel['limits'];
  /** Application credits per output quality (not a vendor price). */
  pricing: Record<GenerationQuality, number>;
  planSizes: GenerationSize[];
}

const OPENAI_SIZES: GenerationSize[] = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 },
];

const GEMINI_SIZES: GenerationSize[] = [
  { width: 1024, height: 1024 },
  { width: 832, height: 1248 },
  { width: 1248, height: 832 },
  { width: 864, height: 1184 },
  { width: 1184, height: 864 },
  { width: 768, height: 1344 },
  { width: 1344, height: 768 },
];

const baseCapabilities = (sizes: GenerationSize[]): CatalogModel['capabilities'] => ({
  modes: ['text_to_image', 'sketch_to_image', 'image_to_image'],
  sizes,
  qualities: ['preview', 'standard'],
  negativePrompt: false,
  seed: false,
  cancellation: false,
  partialImages: false,
});

const LIMITS: CatalogModel['limits'] = {
  maxPromptChars: 4000,
  maxInputImageBytes: 10 * 1024 * 1024,
  inputMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
};

export const CATALOG_DEFINITIONS: CatalogDefinition[] = [
  {
    id: 'simulated-openai-image',
    provider: 'openai',
    mode: 'simulated',
    displayName: 'Image generation (simulated, OpenAI protocol)',
    description: 'Deterministic simulator speaking the OpenAI Images protocol subset. Not a real model.',
    sortOrder: 10,
    capabilities: baseCapabilities(OPENAI_SIZES),
    limits: LIMITS,
    pricing: { preview: 1, standard: 2 },
    planSizes: OPENAI_SIZES,
  },
  {
    id: 'simulated-gemini-image',
    provider: 'gemini',
    mode: 'simulated',
    displayName: 'Image generation (simulated, Gemini protocol)',
    description: 'Deterministic simulator speaking the Gemini generateContent protocol subset. Not a real model.',
    sortOrder: 20,
    capabilities: baseCapabilities(GEMINI_SIZES),
    limits: LIMITS,
    pricing: { preview: 1, standard: 2 },
    planSizes: GEMINI_SIZES,
  },
  {
    id: 'openai-image',
    provider: 'openai',
    mode: 'live',
    displayName: 'OpenAI image generation',
    description: 'Image generation through the OpenAI Images API.',
    sortOrder: 30,
    capabilities: baseCapabilities(OPENAI_SIZES),
    limits: LIMITS,
    pricing: { preview: 2, standard: 4 },
    planSizes: OPENAI_SIZES,
  },
  {
    id: 'gemini-image',
    provider: 'gemini',
    mode: 'live',
    displayName: 'Gemini image generation',
    description: 'Image generation through the Gemini API.',
    sortOrder: 40,
    capabilities: baseCapabilities(GEMINI_SIZES),
    limits: LIMITS,
    pricing: { preview: 2, standard: 4 },
    planSizes: GEMINI_SIZES,
  },
];

export const ALL_PLANS: PlanType[] = ['FREE', 'BASIC', 'PRO', 'TEAM3', 'TEAM5'];
