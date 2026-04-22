import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RetryUtils } from '@/utils/retry.utils';
import {
  ImageGenerationJobData,
  ImageGenerationJobResult,
  ProgressCallback,
} from '@/shared/interfaces/image-generation.interface';
import { InputType } from '@/shared/enums/image-providers.enum';
import { StorageService } from '@/services/storage.service';
import { RedisService } from '@/services/redis.service';
import {
  PythonModelEditParams,
  PythonModelGenerateParams,
} from '@/services/connectors/python-model.connector';
import { AI_PROVIDER, IAIProvider } from '@/infrastructure/ai/ai-provider.interface';

@Injectable()
export class PythonModelProcessor {
  private readonly logger = new Logger(PythonModelProcessor.name);

  constructor(
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAIProvider,
    private readonly storageService: StorageService,
    private readonly redisService: RedisService
  ) {}

  async processImageGeneration(
    jobData: ImageGenerationJobData,
    progressCallback: ProgressCallback
  ): Promise<ImageGenerationJobResult> {
    const { jobId, endpoint } = jobData;
    const method = jobData.generateImageParams?.method || jobData.editImageParams?.method || jobData.method;
    const isEditJob = Boolean(jobData.editImageParams);

    try {
      this.validateJobData(jobData);

      const attributeId = randomUUID();
      const version = randomUUID();

      let imageUrl = '';

      if (isEditJob) {
        const editParams = await this.prepareEditParameters(jobData);
        const editResult = await RetryUtils.retryApiCall(async () => {
          const result = await this.aiProvider.editImage(editParams, progressCallback);
          if (!result.success || !result.data?.image_url) {
            throw result.error || new Error('Bobby AI image-to-image failed');
          }
          return result;
        });

        if (!editResult.success || !editResult.data?.image_url) {
          throw new Error(editResult.error?.message || 'Bobby AI image-to-image failed');
        }

        imageUrl = editResult.data.image_url;
      } else {
        const generateParams = await this.prepareGenerateParameters(jobData);
        const generationResult = await RetryUtils.retryApiCall(async () => {
          const result = await this.aiProvider.generateImage(generateParams, progressCallback);
          if (!result.success || !result.data?.image_url) {
            throw result.error || new Error('Bobby AI image generation failed');
          }
          return result;
        });

        if (!generationResult.success || !generationResult.data?.image_url) {
          throw new Error(generationResult.error?.message || 'Bobby AI image generation failed');
        }

        imageUrl = generationResult.data.image_url;
      }

      const result: ImageGenerationJobResult = {
        jobId,
        requestId: jobData.requestId,
        attributeId,
        version,
        ...(jobData.generateImageParams && {
          generateImageParams: {
            ...jobData.generateImageParams,
            attributeId,
          },
        }),
        ...(jobData.editImageParams && {
          editImageParams: {
            ...jobData.editImageParams,
            attributeId,
          },
        }),
        generatedImage: {
          location: imageUrl,
          eTag: '',
          bucket: '',
          key: attributeId,
          thumbnail: '',
          dimensions: '',
        },
        method,
        credit: jobData.generateImageParams?.credit || jobData.editImageParams?.credit || 0,
        shouldWatermark:
          jobData.generateImageParams?.shouldWatermark || jobData.editImageParams?.shouldWatermark || false,
        generatedAt: new Date(),
        provider: 'python',
        model: endpoint,
      };

      this.logger.log(`Bobby AI job ${jobId} generated temporary output successfully (edit=${isEditJob})`);

      return result;
    } catch (error) {
      this.logger.error(`Bobby AI processing failed for job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  private validateJobData(jobData: ImageGenerationJobData): void {
    const params = jobData.generateImageParams || jobData.editImageParams;
    if (!params || !params.data) {
      throw new Error('Missing parameters or data structure');
    }
  }

  private async prepareGenerateParameters(jobData: ImageGenerationJobData): Promise<PythonModelGenerateParams> {
    const params = jobData.generateImageParams;
    const data = params?.data || {};
    const sdxlParams = data.sdxlParams as Record<string, any> | undefined;

    const prompt = this.extractPrompt(data);
    const { width, height } = this.resolveDimensions(data.imageSize || data.resolution, data.aspectRatio);

    let inputType = 'text-to-image';
    if (data.inputType === InputType.MODEL_3D || data.inputType === InputType.REFERENCE) {
      inputType = 'image-to-image';
    }
    if (data.inputType === InputType.LINE_DRAWING) {
      inputType = 'line-drawing-to-image';
    }

    const sourceImagePath =
      data.imagePath || (Array.isArray(data.referenceImages) ? data.referenceImages[0] : undefined);

    const image =
      sourceImagePath && data.inputType !== InputType.TEXT_PROMPT ? await this.toDataUrl(sourceImagePath) : undefined;

    if (sdxlParams) {
      const mode = this.toOptionalString(sdxlParams.mode) as
        | 'text_to_image'
        | 'sketch_to_image'
        | 'image_to_image'
        | undefined;
      const rawImage =
        this.toOptionalString(sdxlParams.image) ||
        (sourceImagePath ? await this.toDataUrl(sourceImagePath) : undefined);
      const normalizedImage = rawImage ? this.stripDataUrlPrefix(rawImage) : undefined;
      const inference = (sdxlParams.inference || {}) as Record<string, unknown>;
      const controlnet = (sdxlParams.controlnet || {}) as Record<string, unknown>;
      const lora = (sdxlParams.lora || {}) as Record<string, unknown>;

      return {
        mode: mode || 'text_to_image',
        prompt: this.toOptionalString(sdxlParams.prompt) || prompt || 'Create an architectural visualization',
        negative_prompt: this.toOptionalString(sdxlParams.negative_prompt),
        image: normalizedImage,
        controlnet: {
          controlnet_type: this.toOptionalString(controlnet.controlnet_type) === 'canny' ? 'canny' : 'lineart',
          controlnet_scale: this.toNumber(controlnet.controlnet_scale) ?? this.toNumber(data.inputValue) ?? 0.9,
        },
        lora: {
          lora_enabled: typeof lora.lora_enabled === 'boolean' ? lora.lora_enabled : Boolean(data.lora),
          lora_scale: this.toNumber(lora.lora_scale) ?? this.toNumber(data.styleValue) ?? 0.85,
          lora_path: this.toOptionalString(lora.lora_path) || this.toOptionalString(data.lora) || 'house_lora_final',
        },
        inference: {
          num_inference_steps: this.toNumber(inference.num_inference_steps) || this.toNumber(data.step) || 30,
          guidance_scale: this.toNumber(inference.guidance_scale) || this.toNumber(data.guidance) || 7.5,
          width: this.toNumber(inference.width) || width || 1024,
          height: this.toNumber(inference.height) || height || 1024,
          seed: this.toNumber(inference.seed) ?? this.toNumber(data.seed) ?? undefined,
        },
        strength: this.toNumber(sdxlParams.strength) ?? this.toNumber(data.inputValue) ?? undefined,
        metadata: {
          endpoint: jobData.endpoint,
          method: params?.method,
          requestId: jobData.requestId,
        },
      };
    }

    return {
      mode:
        inputType === 'line-drawing-to-image'
          ? 'sketch_to_image'
          : inputType === 'image-to-image'
          ? 'image_to_image'
          : 'text_to_image',
      prompt: prompt || 'Create an architectural visualization',
      width,
      height,
      seed: this.toNumber(data.seed) ?? this.toNumber(data.creativityValue),
      input_type: inputType,
      image,
      strength: this.toNumber(data.inputValue),
      upscale_factor: this.toNumber(data.upscaleBy),
      metadata: {
        endpoint: jobData.endpoint,
        method: params?.method,
      },
    };
  }

  private async prepareEditParameters(jobData: ImageGenerationJobData): Promise<PythonModelEditParams> {
    const params = jobData.editImageParams;
    const data = params?.data || {};

    const sourceImage = await this.toDataUrl(data.imagePath || data.sourceImageUrl || data.styleImageUrl);

    if (!sourceImage) {
      throw new Error('Missing source image for edit operation');
    }

    const prompt = this.extractPrompt(data);
    const stylePrompt = this.toOptionalString(data.stylePrompt);
    const mask = data.mask ? await this.toDataUrl(data.mask) : undefined;
    const crop = data.crop ? await this.toDataUrl(data.crop) : undefined;

    return {
      method: params?.method || 'EDIT_STYLE_TRANSFER',
      prompt,
      style_prompt: stylePrompt,
      image: sourceImage,
      mask,
      crop,
      direction: this.toOptionalString(data.direction),
      pixels: this.toNumber(data.pixels),
      upscale_factor: this.toNumber(data.factor || data.upscaleValue),
      seed: this.toNumber(data.seed) ?? this.toNumber(data.creativityValue),
      metadata: {
        endpoint: jobData.endpoint,
        method: params?.method,
      },
    };
  }

  private extractPrompt(data: Record<string, unknown>): string {
    return (
      this.toOptionalString(data.enhancedPrompt) ||
      this.toOptionalString(data.prompt) ||
      this.toOptionalString(data.promptKeywords) ||
      this.toOptionalString(data.stylePrompt) ||
      ''
    );
  }

  private async toDataUrl(source: unknown): Promise<string | undefined> {
    if (typeof source !== 'string' || !source.trim()) {
      return undefined;
    }

    if (source.startsWith('data:image/')) {
      return source;
    }

    if (/^[A-Za-z0-9+/=\r\n]+$/.test(source) && source.length > 256) {
      return `data:image/png;base64,${source.replace(/\s/g, '')}`;
    }

    if (source.startsWith('http://') || source.startsWith('https://')) {
      const downloaded = await this.storageService.getImageBuffer(source);
      if (downloaded.success && downloaded.data) {
        const base64 = downloaded.data.toString('base64');
        return `data:image/png;base64,${base64}`;
      }
      return source;
    }

    if (source.startsWith('gs://') || source.includes('storage.googleapis.com')) {
      const downloaded = await this.storageService.downloadSourceImage(source);
      if (downloaded.success && downloaded.data) {
        const base64 = downloaded.data.toString('base64');
        return `data:image/png;base64,${base64}`;
      }
    }

    return source;
  }

  private stripDataUrlPrefix(value: string): string {
    const dataUrlMatch = value.match(/^data:image\/[^;]+;base64,(.+)$/);
    return dataUrlMatch ? dataUrlMatch[1] : value;
  }

  private resolveDimensions(imageSize: unknown, aspectRatio: unknown): { width: number; height: number } {
    const size = this.toOptionalString(imageSize)?.toUpperCase();
    const ratio = this.toOptionalString(aspectRatio) || '1:1';

    const parsed = size?.match(/^(\d{2,5})[Xx](\d{2,5})$/);
    if (parsed) {
      return {
        width: this.clampDimension(Number(parsed[1])),
        height: this.clampDimension(Number(parsed[2])),
      };
    }

    const longestSideByQuality: Record<string, number> = {
      '1K': 1024,
      '2K': 2048,
      '4K': 4096,
    };
    const longestSide = longestSideByQuality[size || ''] || 1024;

    const ratioParts = ratio.split(':').map((v) => Number(v));
    const ratioWidth = ratioParts[0];
    const ratioHeight = ratioParts[1];

    if (
      ratioParts.length !== 2 ||
      Number.isNaN(ratioWidth) ||
      Number.isNaN(ratioHeight) ||
      ratioWidth <= 0 ||
      ratioHeight <= 0
    ) {
      return { width: longestSide, height: longestSide };
    }

    const decimalRatio = ratioWidth / ratioHeight;
    if (decimalRatio >= 1) {
      return {
        width: this.clampDimension(longestSide),
        height: this.clampDimension(Math.round(longestSide / decimalRatio)),
      };
    }

    return {
      width: this.clampDimension(Math.round(longestSide * decimalRatio)),
      height: this.clampDimension(longestSide),
    };
  }

  private clampDimension(value: number): number {
    const rounded = Math.round(value);
    return Math.max(256, Math.min(4096, rounded));
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return undefined;
  }

}
