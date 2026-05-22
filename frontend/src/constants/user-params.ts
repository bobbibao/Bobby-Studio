/**
 * Centralized tooltip content configuration for the image generation interface
 * Organized by feature area for easy maintenance and i18n integration
 */

export interface TooltipConfig {
  key: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

/**
 * Generation Tab Tooltips
 */
export const GENERATION_TOOLTIPS = {
  // Creation Type Section
  CREATION_TYPE: {
    key: 'creation_type',
    placement: 'top' as const,
  },

  // Input Type Section
  INPUT_TYPE: {
    key: 'input_type',
    placement: 'top' as const,
  },

  // Prompt Settings Section
  PROMPT: {
    key: 'prompt',
    placement: 'top' as const,
  },

  // Style Selection
  SELECT_STYLE: {
    key: 'select_style',
    placement: 'top' as const,
  },

  // Settings Section
  SETTINGS: {
    key: 'settings',
    placement: 'top' as const,
  },

  // Pro Mode Toggle
  PRO_MODE: {
    key: 'pro_mode',
    placement: 'top' as const,
  },
} as const;

/**
 * Edit Tab Tooltips
 */
export const EDIT_TOOLTIPS = {
  // Edit Mode Selection
  EDIT_MODE: {
    key: 'edit_mode',
    placement: 'top' as const,
  },

  // Edit Parameters
  EDIT_PARAMS: {
    key: 'edit_params',
    placement: 'top' as const,
  },
} as const;

/**
 * Model Selection Tooltips
 */
export const MODEL_TOOLTIPS = {
  MODEL_SELECTOR: {
    key: 'model_selector',
    placement: 'top' as const,
  },
} as const;

/**
 * Get all tooltips as a flat array (useful for debugging/documentation)
 */
export const getAllTooltips = (): TooltipConfig[] => {
  return [...Object.values(GENERATION_TOOLTIPS), ...Object.values(EDIT_TOOLTIPS), ...Object.values(MODEL_TOOLTIPS)];
};

