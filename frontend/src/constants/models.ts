import { EditingModelId } from './edit-enum';
import { GenerationModelId } from './generate-enum';

export type PlanCode = 'FREE' | 'BASIC' | 'PRO' | 'TEAM3' | 'TEAM5';

export interface ModelDefinition {
  id: string;
  label: string;
}

export interface ModelCatalogPlanEntitlement {
  plan: PlanCode;
  enabled: boolean;
  allowedResolutions: string[];
}

export interface ModelCatalogEntry {
  id: string;
  provider: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  metadata?: Record<string, any> | null;
  entitlements: ModelCatalogPlanEntitlement[];
}

const PLAN_ORDER: PlanCode[] = ['FREE', 'BASIC', 'PRO', 'TEAM3', 'TEAM5'];
const RES = ['1K', '2K', '4K'];

const entitlementsForAll = (): ModelCatalogPlanEntitlement[] =>
  PLAN_ORDER.map((plan) => ({
    plan,
    enabled: true,
    allowedResolutions: RES,
  }));

export const DEFAULT_MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: GenerationModelId.PYTHON_VISION_LOCAL,
    provider: 'python',
    displayName: 'Bobby AI',
    description: 'Bobby Python Model Service for SDXL, ControlNet, LoRA, sketch-to-image, text-to-image, and image-to-image',
    sortOrder: 10,
    metadata: {
      supports4k: true,
      inputTypes: ['text-prompt', 'reference', 'line-drawing', '3d-model'],
      supports: ['sdxl', 'controlnet', 'lora'],
    },
    entitlements: entitlementsForAll(),
  },
];

const planNormalizer = (plan?: string | null): PlanCode => {
  const upper = (plan || '').toUpperCase();
  if (PLAN_ORDER.includes(upper as PlanCode)) {
    return upper as PlanCode;
  }
  if (upper === 'TEAM') {
    return 'TEAM3';
  }
  return 'FREE';
};

export const mapCatalogToPlan = (plan?: string | null) => {
  const normalized = planNormalizer(plan);
  return DEFAULT_MODEL_CATALOG.map((entry) => {
    const entitlement =
      entry.entitlements.find((ent) => ent.plan === normalized) ||
      entry.entitlements[0];
    return {
      id: entry.id,
      provider: entry.provider,
      displayName: entry.displayName,
      description: entry.description,
      sortOrder: entry.sortOrder,
      metadata: entry.metadata,
      status: 'active',
      entitlements: {
        enabled: entitlement?.enabled ?? true,
        allowedResolutions: entitlement?.allowedResolutions ?? RES,
      },
    };
  });
};

export const GENERATION_MODELS: ModelDefinition[] = [
  {
    id: GenerationModelId.PYTHON_VISION_LOCAL,
    label: 'Bobby AI',
  },
];

export const EDITING_MODELS: ModelDefinition[] = [
  {
    id: EditingModelId.PYTHON_VISION_LOCAL,
    label: 'Bobby AI',
  },
];

export const VIDEO_MODELS: ModelDefinition[] = [];

export const DEFAULT_GENERATION_MODEL_PRO = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_PRO = EditingModelId.PYTHON_VISION_LOCAL;

export const DEFAULT_GENERATION_MODEL_BASIC = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_BASIC = EditingModelId.PYTHON_VISION_LOCAL;

export const DEFAULT_GENERATION_MODEL_FREE = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_FREE = EditingModelId.PYTHON_VISION_LOCAL;

