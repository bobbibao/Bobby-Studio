import { EditingModelId } from './edit-enum';
import { GenerationModelId } from './generate-enum';

export type PlanCode = 'FREE' | 'BASIC' | 'PRO' | 'TEAM3' | 'TEAM5';

/** Labels for model ids stored on historical records. Access to models is decided by the server catalog only. */
export interface ModelDefinition {
  id: string;
  label: string;
}

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

export const DEFAULT_GENERATION_MODEL_PRO = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_PRO = EditingModelId.PYTHON_VISION_LOCAL;

export const DEFAULT_GENERATION_MODEL_BASIC = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_BASIC = EditingModelId.PYTHON_VISION_LOCAL;

export const DEFAULT_GENERATION_MODEL_FREE = GenerationModelId.PYTHON_VISION_LOCAL;
export const DEFAULT_EDITING_MODEL_FREE = EditingModelId.PYTHON_VISION_LOCAL;

