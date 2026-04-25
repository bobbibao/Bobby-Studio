import { PlanType } from '@prisma/client';

import { PLAN_TYPE } from '../../constant/user.constants';
import { ACTION_TYPES, GENERATION_MODEL_IDS, PROVIDERS, RESOLUTION } from '../../constant/model.constants';

export type ModelEntitlementConfig = {
  plan: PlanType;
  enabled: boolean;
  allowedResolutions: string[];
  metadata?: Record<string, any> | null;
};

export type ModelCatalogDefinition = {
  id: string;
  provider: string;
  displayName: string;
  description?: string;
  connectorFunction?: string | null;
  status?: 'active' | 'disabled';
  sortOrder: number;
  metadata?: Record<string, any> | null;
  pricing?: Record<string, number>;
  entitlements: ModelEntitlementConfig[];
};

export const PLAN_ORDER: PLAN_TYPE[] = [PLAN_TYPE.FREE, PLAN_TYPE.BASIC, PLAN_TYPE.PRO, PLAN_TYPE.TEAM3, PLAN_TYPE.TEAM5];
const DEFAULT_RESOLUTIONS = [RESOLUTION.ONE_K, RESOLUTION.TWO_K, RESOLUTION.FOUR_K];

const enabledForAllPlans = (): ModelEntitlementConfig[] =>
  PLAN_ORDER.map((plan) => ({
    plan,
    enabled: true,
    allowedResolutions: DEFAULT_RESOLUTIONS,
    metadata: { source: 'bobby-default' },
  }));

export const DEFAULT_MODEL_CATALOG: ModelCatalogDefinition[] = [
  {
    id: GENERATION_MODEL_IDS.PYTHON_VISION_LOCAL,
    provider: PROVIDERS.PYTHON,
    displayName: 'Bobby AI',
    connectorFunction: 'generateWithBobbyPythonModel',
    description: 'Bobby Python Model Service for SDXL, ControlNet, LoRA, sketch-to-image, text-to-image, and image-to-image',
    sortOrder: 5,
    metadata: {
      actionTypes: [ACTION_TYPES.IMAGE_GENERATION],
      supports: ['sdxl', 'controlnet', 'lora', 'sketch-to-image', 'text-to-image', 'image-to-image'],
    },
    pricing: {
      [RESOLUTION.ONE_K]: 1,
      [RESOLUTION.TWO_K]: 1,
      [RESOLUTION.FOUR_K]: 1,
    },
    entitlements: enabledForAllPlans(),
  },
];
