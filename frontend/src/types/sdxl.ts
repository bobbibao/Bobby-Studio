export type SdxlGenerationMode = 'text_to_image' | 'sketch_to_image' | 'image_to_image';

export type SdxlControlNetType = 'canny' | 'lineart';

export interface SdxlControlNetSettings {
  controlnet_type: SdxlControlNetType;
  controlnet_scale: number;
}

export interface SdxlLoraSettings {
  lora_enabled: boolean;
  lora_scale: number;
  lora_path?: string;
}

export interface SdxlInferenceSettings {
  num_inference_steps: number;
  guidance_scale: number;
  width: number;
  height: number;
  seed?: number;
}

export interface SdxlGenerateRequest {
  userId?: string;
  userEmail?: string;
  projectId?: string | null;
  folderId?: string | null;
  mode: SdxlGenerationMode;
  prompt: string;
  negative_prompt?: string;
  image?: string;
  controlnet?: SdxlControlNetSettings;
  lora?: SdxlLoraSettings;
  inference: SdxlInferenceSettings;
  strength?: number;
  prompt_enhancement_enabled?: boolean;
}

export interface SdxlGenerateResponse {
  jobIds: string[];
  requestId: string;
  message: string;
}

export interface SdxlQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface SdxlGenerationMetadata {
  mode: SdxlGenerationMode;
  model: string;
  controlnetType?: SdxlControlNetType;
  controlnetScale?: number;
  loraEnabled?: boolean;
  loraScale?: number;
  loraPath?: string;
  inferenceSteps: number;
  guidanceScale: number;
  width: number;
  height: number;
  seed?: number;
  generationTimeMs?: number;
}

