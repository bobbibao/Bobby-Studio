import { GenerationModelId } from '@/constants/generate-enum';
import {
  DEFAULT_GENERATION_MODEL_BASIC,
  DEFAULT_GENERATION_MODEL_FREE,
  DEFAULT_GENERATION_MODEL_PRO,
  DEFAULT_EDITING_MODEL_BASIC,
  DEFAULT_EDITING_MODEL_FREE,
  DEFAULT_EDITING_MODEL_PRO,
  ModelDefinition,
  PlanCode,
} from '@/constants/models';

const normalize = (value?: string | null): PlanCode | null => {
  if (!value) return null;
  const upper = value.toString().toUpperCase();
  if (upper === 'TEAM') return 'TEAM3';
  if (
    upper === 'FREE' ||
    upper === 'BASIC' ||
    upper === 'PRO' ||
    upper === 'TEAM3' ||
    upper === 'TEAM5'
  ) {
    return upper as PlanCode;
  }
  return null;
};

export const resolvePlan = (role?: string | null, subscriptionPlan?: string | null): PlanCode | null => {
  return normalize(subscriptionPlan) || normalize(role);
};

export const getProjectLimit = (plan: PlanCode | null): number | null => {
  if (plan === 'FREE') return 1;
  if (plan === 'BASIC') return 5;
  return null; // PRO/TEAM => unlimited
};

export const getProjectLimitMessage = (plan: PlanCode | null): { key: string; fallback: string } | null => {
  if (plan === 'FREE') {
    return {
      key: 'common:project_limit_free',
      fallback: 'Free plan limited to 1 project. Upgrade to Basic/PRO for more.',
    };
  }
  if (plan === 'BASIC') {
    return {
      key: 'common:project_limit_basic',
      fallback: 'Basic plan limited to 5 projects. Upgrade to PRO for unlimited projects.',
    };
  }
  return null;
};

export const getRestrictedGenerationModelIds = (
  plan: PlanCode | null,
  allModels: ModelDefinition[]
): string[] => {
  return [];
};

export const getAllowedGenerationModelIds = (plan: PlanCode | null, allModels: ModelDefinition[]): string[] => {
  const restricted = new Set(getRestrictedGenerationModelIds(plan, allModels));
  return allModels.filter((model) => !restricted.has(model.id)).map((model) => model.id);
};

export const getDefaultGenerationModelId = (plan: PlanCode | null): GenerationModelId => {
  if (plan === 'PRO' || plan === 'TEAM3' || plan === 'TEAM5') return DEFAULT_GENERATION_MODEL_PRO;
  if (plan === 'BASIC') return DEFAULT_GENERATION_MODEL_BASIC;
  return DEFAULT_GENERATION_MODEL_FREE;
};

export const getDefaultEditingModelId = (plan: PlanCode | null): string => {
  if (plan === 'PRO' || plan === 'TEAM3' || plan === 'TEAM5') return DEFAULT_EDITING_MODEL_PRO;
  if (plan === 'BASIC') return DEFAULT_EDITING_MODEL_BASIC;
  return DEFAULT_EDITING_MODEL_FREE;
};

export const getHistoryNotice = (plan: PlanCode | null): { key: string; fallback: string } | null => {
  if (plan === 'FREE') {
    return {
      key: 'common:history_limit_free',
      fallback: 'Showing last 1 month. Upgrade to PRO for full history.',
    };
  }
  if (plan === 'BASIC') {
    return {
      key: 'common:history_limit_basic',
      fallback: 'Showing last 2 months. Upgrade to PRO for full history.',
    };
  }
  return null;
};

