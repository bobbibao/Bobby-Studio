export enum ImageProviders {
  PYTHON = 'python',
}

export enum ImageGenerationMethod {
  BASIC_TEXT_TO_IMAGE = 'BASIC_TEXT_TO_IMAGE',
  PRO_TEXT_TO_IMAGE = 'PRO_TEXT_TO_IMAGE',
  BASIC_LINE_DRAWING_TO_IMAGE = 'BASIC_LINE_DRAWING_TO_IMAGE',
  PRO_LINE_DRAWING_TO_IMAGE = 'PRO_LINE_DRAWING_TO_IMAGE',
  BASIC_IMAGE_UPSCALING = 'BASIC_IMAGE_UPSCALING',
  PRO_IMAGE_UPSCALING = 'PRO_IMAGE_UPSCALING',
  BASIC_IMAGE_TO_IMAGE = 'BASIC_IMAGE_TO_IMAGE',
  PRO_IMAGE_TO_IMAGE = 'PRO_IMAGE_TO_IMAGE',
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ProcessingStage {
  VALIDATING = 'validating',
  PREPARING = 'preparing',
  GENERATING = 'generating',
  UPLOADING = 'uploading',
  SAVING = 'saving',
  COMPLETED = 'completed',
}

export enum ModelEndpoints {
  PYTHON_VISION_LOCAL = 'python-vision-local',
}

export enum CreationType {
  EXTERIOR = 'exterior',
  INTERIOR = 'interior',
}

export enum InputType {
  TEXT_PROMPT = 'text-prompt',
  MODEL_3D = '3d-model',
  LINE_DRAWING = 'line-drawing',
  REFERENCE = 'reference',
  EDIT_REPLACE = 'edit-replace',
  EDIT_EXTEND = 'edit-extend',
}

export enum StyleEnum {
  MODERN = 'modern',
  CHALET = 'chalet',
  APARTMENT_BUILDING = 'apartment',
  DARK_FACADE = 'dark-fa',
  WOOD_FACADE = 'wood',
  CREATIVE = 'creative',
  TROPICAL_VILLA = 'tropical',
  TROPICAL_TOWER = 'tropical-tow',
}
