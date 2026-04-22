import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ApiKeysConfig } from '@/config/api-keys.config';
import { ProcessingResult } from '@/shared/interfaces/api-response.interface';
import { ProgressCallback } from '@/shared/interfaces/image-generation.interface';
import { ProcessingStage } from '@/shared/enums/image-providers.enum';

export interface PythonModelGenerateParams {
  mode?: 'text_to_image' | 'sketch_to_image' | 'image_to_image';
  prompt: string;
  negative_prompt?: string;
  image?: string;
  controlnet?: {
    controlnet_type: 'canny' | 'lineart';
    controlnet_scale: number;
  };
  lora?: {
    lora_enabled: boolean;
    lora_scale: number;
    lora_path?: string;
  };
  inference?: {
    num_inference_steps: number;
    guidance_scale: number;
    width: number;
    height: number;
    seed?: number;
  };
  width?: number;
  height?: number;
  seed?: number;
  input_type?: string;
  strength?: number;
  upscale_factor?: number;
  metadata?: Record<string, unknown>;
}

export interface PythonModelEditParams {
  method: string;
  prompt?: string;
  style_prompt?: string;
  image: string;
  mask?: string;
  crop?: string;
  direction?: string;
  pixels?: number;
  upscale_factor?: number;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface PythonModelResponse {
  job_id?: string;
  status?: string;
  image_url?: string;
  image?: string;
  image_base64?: string;
  output?: string | string[];
  images?: string[];
  width?: number;
  height?: number;
  generation_time?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PythonModelConnector {
  private readonly logger = new Logger(PythonModelConnector.name);
  private readonly client: AxiosInstance;

  constructor(private readonly apiKeysConfig: ApiKeysConfig) {
    console.log('Initializing Bobby Python Model Service connector with base URL:', this.apiKeysConfig.pythonModelBaseUrl);
    this.client = axios.create({
      baseURL: this.apiKeysConfig.pythonModelBaseUrl,
      timeout: this.apiKeysConfig.pythonModelTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private normalizeImageOutput(response: PythonModelResponse): string | undefined {
    const candidate =
      response.image_url ||
      response.image ||
      response.image_base64 ||
      (Array.isArray(response.output) ? response.output[0] : response.output) ||
      (Array.isArray(response.images) ? response.images[0] : undefined);

    if (!candidate || typeof candidate !== 'string') {
      return undefined;
    }

    if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('data:image/')) {
      return candidate;
    }

    if (/^[A-Za-z0-9+/=\r\n]+$/.test(candidate) && candidate.length > 256) {
      return `data:image/png;base64,${candidate.replace(/\s/g, '')}`;
    }

    return candidate;
  }

  async generateImage(
    params: PythonModelGenerateParams,
    progressCallback: ProgressCallback
  ): Promise<ProcessingResult<PythonModelResponse>> {
    try {
      await progressCallback({
        stage: ProcessingStage.VALIDATING,
        percentage: 5,
        message: 'Validating Bobby AI generation request',
      });

      const payload = {
        mode: params.mode || 'text_to_image',
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        image: params.image,
        controlnet: params.controlnet,
        lora: params.lora,
        inference:
          params.inference || {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: params.width || 1024,
            height: params.height || 1024,
            seed: params.seed,
          },
        strength: params.strength,
        metadata: params.metadata,
      };

      const { data } = await this.client.post<PythonModelResponse>(
        '/api/v2/generate',
        payload
      );

      const imageUrl = this.normalizeImageOutput(data);

      if (!imageUrl) {
        throw new Error('Python model response did not include an image output');
      }

      await progressCallback({
        stage: ProcessingStage.GENERATING,
        percentage: 75,
        message: 'Bobby AI generated image',
      });

      return {
        success: true,
        data: {
          ...data,
          image_url: imageUrl,
          width: data.width || params.inference?.width || params.width || 1024,
          height: data.height || params.inference?.height || params.height || 1024,
        },
      };
    } catch (error) {
      console.error('Error in Bobby Python Model Service connector:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async editImage(
    params: PythonModelEditParams,
    progressCallback: ProgressCallback
  ): Promise<ProcessingResult<PythonModelResponse>> {
    try {
      await progressCallback({
        stage: ProcessingStage.VALIDATING,
        percentage: 5,
        message: 'Validating Bobby AI image-to-image request',
      });

      const { data } = await this.client.post<PythonModelResponse>('/api/v2/generate', {
        mode: 'image_to_image',
        prompt: params.prompt || params.style_prompt || 'Edit the input architectural image',
        image: params.image,
        strength: params.upscale_factor ? undefined : 0.55,
        metadata: params.metadata,
      });

      const imageUrl = this.normalizeImageOutput(data);
      if (!imageUrl) {
        throw new Error('Python model response did not include an edited image output');
      }

      await progressCallback({
        stage: ProcessingStage.GENERATING,
        percentage: 75,
        message: 'Bobby AI edited image',
      });

      return {
        success: true,
        data: {
          ...data,
          image_url: imageUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
