import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { RedisService } from '../../shared/services/redis.service';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { JobStatusGateway } from './job-status.gateway';
import { eventType, ImageGenerationJobResultData } from './dto/image-webhook.dto';
import { ImageGenerationRepository } from './image-generation.repository';
import { PrismaService } from '../../../prisma/prisma.service';

import {
  TextToImageDto,
  ImageToImageDto,
  LineDrawingToImageDto,
  ImageUpscalingDto,
  ImageGenerationMethod,
  GenerateImageDTO,
} from './dto/image-generation-job.dto';
import { SdxlGenerateImageDto, SdxlGenerationMode } from './dto/sdxl-generation.dto';
import { ImageGenerationRequestDto } from './dto/image-request.dto';
import {
  ImageGenerationResponseDto,
  JobStatusResponseDto,
  JobResultDto,
  JobStatus,
} from './dto/image-response.dto';
import { ImageGenerationConfigService } from './image-generation-config.service';
import { AttributeService } from '../attribute/attribute.service';
import {
  AttributeTypeEnum,
  InputTypeEnum,
  InspirationMethodEnum,
} from 'src/constant/attribute-type.enum';
import {
  ActionEntity,
  AttributeEntity,
  GeneratedImageAttributeEntity,
  ProjectAttributeEntity,
} from '../attribute/dto/common.dto';
import { ACTION_TYPES, MODELS } from 'src/constant/model.constants';
import { CreditSystemService } from '../credit-system/credit-system.service';
import { DEFAULT_USER_ROLE } from 'src/config/roles.config';
// import { EntitlementService } from './entitlement.service';
import { EntitlementService } from 'src/service/entitlement/entitlement.service';
import { ModelCatalogDefinition } from '../model-catalog/model-catalog.defaults';
import { ModelCatalogResponseDto } from '../model-catalog/dto/model-response.dto';
// import { ModelCatalogService } from '../model-catalog/model-catalog.service';
import { ModelCatalogService } from 'src/service/model-catalog/model-catalog.service';
import {
  GenerationStatus,
  toGenerationStatus,
} from '../../domain/generation/generation-status';
@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly useBobbyAiOnly =
    String(process.env.BOBBY_AI_ONLY || 'true').toLowerCase() === 'true';

  constructor(
    @InjectQueue('image-generation') private readonly queue: Queue,
    @InjectQueue('image-post-processing')
    private readonly postProcessingQueue: Queue,
    private readonly redisService: RedisService,
    private readonly vizpointService: VizpointService,
    private readonly attributeService: AttributeService,
    private readonly imageGenerationConfigService: ImageGenerationConfigService,
    private readonly jobStatusGateway: JobStatusGateway,
    private readonly imageGenerationRepository: ImageGenerationRepository,
    private readonly prisma: PrismaService,
    private readonly creditSystemService: CreditSystemService,
    private readonly entitlementService: EntitlementService,
    private readonly modelCatalogService: ModelCatalogService,
  ) {}

  private async createImageRequest(
    userId: string,
    method: string,
    parameters: Record<string, unknown>,
  ): Promise<string> {
    return await this.imageGenerationRepository.createImageRequest({
      userId,
      method,
      parameters,
    });
  }

  private async createImageJob(
    jobId: string,
    requestId: string,
    modelName: string,
    provider: string,
  ): Promise<void> {
    await this.imageGenerationRepository.createImageJob({
      jobId,
      requestId,
      modelName,
      provider,
    });
  }

  private async updateImageRequestStatus(
    requestId: string,
    status: GenerationStatus | string,
  ): Promise<void> {
    await this.imageGenerationRepository.updateImageRequestStatus({
      requestId,
      status,
    });
  }

  private async updateImageJobStatus(
    jobId: string,
    status: GenerationStatus | string,
    error?: string,
  ): Promise<void> {
    await this.imageGenerationRepository.updateImageJobStatus({
      jobId,
      status,
      error,
    });
  }

  private async checkBatchCompletion(requestId: string): Promise<boolean> {
    const result = await this.imageGenerationRepository.checkBatchCompletion(requestId);

    this.logger.log(
      `Batch completion check for request ${requestId}: ${result.completed}/${result.total} jobs finished (${result.failed} failed). IsComplete: ${result.isComplete}`,
    );

    if (result.isComplete) {
      const status = result.failed > 0 ? GenerationStatus.FAILED : GenerationStatus.COMPLETED;
      this.logger.log(`Batch ${requestId} completed with status: ${status}`);
      await this.updateImageRequestStatus(requestId, status);
    }

    return result.isComplete;
  }

  private async checkJobsStatus(jobId: string): Promise<void> {
    try {
      const jobStatus = await this.redisService.getJobStatus(jobId);
      if (jobStatus && jobStatus.metadata && jobStatus.metadata.requestId) {
        const batchCompleted = await this.checkBatchCompletion(jobStatus.metadata.requestId);
        if (batchCompleted) {
          this.logger.log(`Batch ${jobStatus.metadata.requestId} completed from jobId ${jobId}`);
        }
        return;
      }

      const requestId = await this.imageGenerationRepository.getRequestIdFromJobId(jobId);
      if (requestId) {
        const batchCompleted = await this.checkBatchCompletion(requestId);
        if (batchCompleted) {
          this.logger.log(`Batch ${requestId} completed via database lookup from jobId ${jobId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not check batch completion from jobId ${jobId}: ${error.message}`);
    }
  }

  async generateSdxlImage(
    sdxlDto: SdxlGenerateImageDto,
    userRole?: string,
  ): Promise<ImageGenerationResponseDto> {
    if (sdxlDto.mode !== SdxlGenerationMode.TEXT_TO_IMAGE && !sdxlDto.image) {
      throw new HttpException(
        'An input image is required for sketch-to-image and image-to-image generation',
        HttpStatus.BAD_REQUEST,
      );
    }

    const imageSize = `${sdxlDto.inference.width}x${sdxlDto.inference.height}`;
    const inputValue =
      sdxlDto.mode === SdxlGenerationMode.IMAGE_TO_IMAGE
        ? (sdxlDto.strength ?? 0.55)
        : (sdxlDto.controlnet?.controlnet_scale ?? 0.9);

    const method =
      sdxlDto.mode === SdxlGenerationMode.TEXT_TO_IMAGE
        ? ImageGenerationMethod.BASIC_TEXT_TO_IMAGE
        : sdxlDto.mode === SdxlGenerationMode.SKETCH_TO_IMAGE
          ? ImageGenerationMethod.BASIC_LINE_DRAWING_TO_IMAGE
          : ImageGenerationMethod.BASIC_IMAGE_TO_IMAGE;

    const inputType =
      sdxlDto.mode === SdxlGenerationMode.TEXT_TO_IMAGE
        ? InputTypeEnum.TEXT_PROMPT
        : sdxlDto.mode === SdxlGenerationMode.SKETCH_TO_IMAGE
          ? InputTypeEnum.LINE_DRAWING
          : InputTypeEnum.REFERENCE;

    const baseData = {
      attributeId: '',
      imageSize,
      aspectRatio: `${sdxlDto.inference.width}:${sdxlDto.inference.height}`,
      seed: sdxlDto.inference.seed ?? -1,
      creationType: 'exterior',
      inputType,
      inputValue,
      styleValue: sdxlDto.lora?.lora_scale ?? 0.85,
      creativityValue: sdxlDto.inference.guidance_scale,
      selectedStyle: 'architectural-realism',
      prompt: sdxlDto.prompt,
      promptKeywords: sdxlDto.prompt,
      enhancedPrompt: sdxlDto.prompt,
      enabledAiPrompt: Boolean(sdxlDto.prompt_enhancement_enabled),
      template: method,
      lora: sdxlDto.lora?.lora_path || 'house_lora_final',
      step: sdxlDto.inference.num_inference_steps,
      guidance: sdxlDto.inference.guidance_scale,
      sdxlParams: sdxlDto,
    };

    const data =
      method === ImageGenerationMethod.BASIC_TEXT_TO_IMAGE
        ? baseData
        : {
            ...baseData,
            imageId: 'sdxl-inline-image',
            imagePath: sdxlDto.image ? 'inline://sdxl-input' : '',
          };

    const legacyDto = {
      userId: sdxlDto.userId,
      userEmail: sdxlDto.userEmail || 'unknown@example.com',
      method,
      numImages: 1,
      projectId: sdxlDto.projectId,
      folderId: sdxlDto.folderId,
      selectedModels: [MODELS.PYTHON_VISION_LOCAL],
      data,
    } as GenerateImageDTO<TextToImageDto | ImageToImageDto | LineDrawingToImageDto> & {
      numImages: number;
    };

    return this.generateImage(legacyDto, userRole);
  }

  /**
   * Extract model name from endpoint
   */
  private extractModelName(endpoint: string): string {
    if (endpoint.startsWith('python-')) {
      return endpoint.replace('python-', '').replace(/-/g, '_');
    }

    return endpoint;
  }

  /**
   * Extract provider from endpoint
   */
  private extractProvider(endpoint: string): string {
    if (endpoint.startsWith('python-')) return 'python';

    return 'python';
  }

  async handleJobCompleted(data: ImageGenerationJobResultData): Promise<void> {
    const image: GeneratedImageAttributeEntity = {
      key: data.generatedImage.key,
      path: data.generatedImage.location,
      previousImageId: data.attributeId,
      thumbnail: data.generatedImage.thumbnail,
      dimensions: data.generatedImage.dimensions,
      ...(data.generatedImage.original
        ? {
            original: {
              path: data.generatedImage.original.location,
              thumbnail: data.generatedImage.original.thumbnail,
            },
          }
        : {}),
    };

    this.logger.log(`🔄 Processing job completion for job ${data.jobId}`);
    this.logger.log(`📸 Generated image path: ${data.generatedImage.location}`);
    this.logger.log(`🖼️ Thumbnail path: ${data.generatedImage.thumbnail}`);
    if (data.generatedImage.original) {
      this.logger.log(`🖼️ Original image path: ${data.generatedImage.original.location}`);
    }

    const action: ActionEntity = {
      createdAt: new Date(),
      method: data.method as InspirationMethodEnum,
      generateImageParams: data.generateImageParams,
      jobId: data.jobId,
    };

    const attr: AttributeEntity<GeneratedImageAttributeEntity, ActionEntity> = {
      id: data.generateImageParams.userId,
      attributeId: data.attributeId,
      type: AttributeTypeEnum.GENERATED_IMAGE,
      version: data.version,
      value: image,
      actions: action,
      jobId: data.jobId,
    };

    try {
      // Update ImageJob status to completed
      await this.imageGenerationRepository.updateImageJobStatus({
        jobId: data.jobId,
        status: GenerationStatus.COMPLETED,
      });

      // Combine attribute creation and credit consumption in parallel for better performance
      // Wrap attribute creation in a small retry loop to handle transient DB/transaction errors
      const maxCreateAttempts = 3;
      let createAttempt = 0;
      let createErr: Error | null = null;

      while (createAttempt < maxCreateAttempts) {
        createAttempt += 1;
        try {
          await Promise.all([
            this.attributeService.createAttributes([attr]),
            this.vizpointService.consumeVizPoints(
              data.generateImageParams.userId,
              data.credit || 0,
            ),
          ]);
          createErr = null;
          break;
        } catch (err) {
          createErr = err instanceof Error ? err : new Error(String(err));
          this.logger.warn(
            `Attempt ${createAttempt} to create attributes failed: ${createErr.message}`,
          );
          const backoff = 200 * Math.pow(2, createAttempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }

      if (createErr) {
        // If still failing after retries, log and rethrow to let caller handle it
        this.logger.error(
          `Failed to create attributes for job ${data.jobId} after ${maxCreateAttempts} attempts: ${createErr.message}`,
        );
        throw createErr;
      }

      // Assign image to folder if projectId and folderId are provided
      if (data.generateImageParams?.projectId && data.generateImageParams?.folderId) {
        try {
          await this.assignGeneratedImageToFolder(
            data.generateImageParams.userId,
            data.generateImageParams.projectId,
            data.generateImageParams.folderId,
            data.attributeId,
            data.generatedImage.location,
          );
          this.logger.log(
            `✅ Image ${data.attributeId} successfully assigned to folder ${data.generateImageParams.folderId} in project ${data.generateImageParams.projectId}`,
          );
        } catch (folderAssignError) {
          this.logger.warn(
            `Failed to assign image to folder: ${folderAssignError.message}. Image created but not assigned to folder.`,
          );
          // Don't rethrow - image was created successfully, assignment is a nice-to-have
        }
      }

      // Check if all jobs in the batch are completed
      const jobStatus = await this.redisService.getJobStatus(data.jobId);
      if (jobStatus && jobStatus.metadata && jobStatus.metadata.requestId) {
        const batchCompleted = await this.checkBatchCompletion(jobStatus.metadata.requestId);
        if (batchCompleted) {
          this.logger.log(`Batch ${jobStatus.metadata.requestId} completed`);
        }
      } else {
        try {
          const requestId = await this.imageGenerationRepository.getRequestIdFromJobId(data.jobId);

          if (requestId) {
            const batchCompleted = await this.checkBatchCompletion(requestId);
            if (batchCompleted) {
              this.logger.log(`Batch ${requestId} completed via database lookup`);
            }
          }
        } catch (dbError) {
          this.logger.warn(`Could not lookup requestId from database: ${dbError.message}`);
        }
      }
    } catch (error) {
      // Update ImageJob status to failed if there was an error
      await this.updateImageJobStatus(data.jobId, GenerationStatus.FAILED, error.message);

      this.logger.error(`Failed to create attributes for job ${data.jobId}: ${error.message}`);
    }
  }

  /**
   * Assigns a generated image to a folder in a project
   * Uses direct database update to preserve all existing data and versions
   */
  private async assignGeneratedImageToFolder(
    userId: string,
    projectId: string,
    folderName: string,
    imageId: string,
    imagePath: string,
  ): Promise<void> {
    try {
      // Fetch the LATEST project attribute to get current state
      const userAttributes = await this.attributeService.getUserProjects(userId, 'desc', []);

      if (!userAttributes || userAttributes.length === 0) {
        throw new Error(`No projects found for user ${userId}`);
      }

      const project = userAttributes.find((p) => p.attributeId === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found for user ${userId}`);
      }

      // Deep clone the project data to avoid mutations
      const updatedProjectValue = JSON.parse(JSON.stringify(project.value));

      if (!updatedProjectValue.folders) {
        throw new Error(`Project ${projectId} has no folders`);
      }

      let folderFound = false;
      let folderUpdated = false;

      // Find and update the target folder
      for (const folder of updatedProjectValue.folders) {
        if (folder.name === folderName) {
          folderFound = true;
          if (!folder.images) {
            folder.images = [];
          }

          // Check if image already exists in folder to avoid duplicates
          const imageExists = folder.images.some(
            (img) => img.id === imageId || img.path === imagePath,
          );

          if (!imageExists) {
            // Add the image to this folder
            folder.images.push({
              id: imageId,
              path: imagePath,
            });
            folderUpdated = true;
          }
          break;
        }
      }

      if (!folderFound) {
        throw new Error(`Folder ${folderName} not found in project ${projectId}`);
      }

      if (!folderUpdated) {
        this.logger.log(`Image ${imageId} already exists in folder ${folderName}`);
        return;
      }

      // Use repository to update the active attribute record
      // This preserves all existing versions and doesn't create duplicates
      await this.imageGenerationRepository.updateProjectAttribute({
        projectId,
        version: project.version,
        value: updatedProjectValue,
      });

      this.logger.log(
        `✅ Image ${imageId} assigned to folder ${folderName} in project ${projectId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to assign image to folder: ${error.message}`);
      throw error;
    }
  }

  async generateImage(
    generateDto: GenerateImageDTO<
      TextToImageDto | ImageToImageDto | LineDrawingToImageDto | ImageUpscalingDto
    > & {
      numImages: number;
    },
    userRole?: string,
  ): Promise<ImageGenerationResponseDto> {
    // Normalize flattened data structure into proper nested format
    if (!generateDto.data) {
      this.logger.warn('[LOCAL DEV] Normalizing flattened request structure');
      const flatData = generateDto as any;
      generateDto.data = {
        imageSize: flatData.imageSize || '1024x1024',
        prompt: flatData.prompt || flatData.inputValue || '',
        inputType: flatData.inputType || 'text-prompt',
        seed: flatData.seed !== undefined ? flatData.seed : -1,
        creativityValue: flatData.creativityValue !== undefined ? flatData.creativityValue : 0.5,
        styleValue: flatData.styleValue !== undefined ? flatData.styleValue : 0.5,
        inputValue: flatData.inputValue !== undefined ? flatData.inputValue : 0.5,
        template: flatData.template || 'default',
        creationType: flatData.creationType || 'interior',
        enhancedPrompt: flatData.enhancedPrompt || flatData.prompt || '',
        enabledAiPrompt: flatData.enabledAiPrompt !== undefined ? flatData.enabledAiPrompt : false,
        selectedStyle: flatData.selectedStyle || 'modern',
        lora: flatData.lora || '',
      } as any;
    }

    const { userId, userEmail, method, numImages, data, projectId, folderId, selectedModels } =
      generateDto;

    // Create a mutable copy for potential fallback adjustments
    let adjustedNumImages = numImages;

    try {
      // Validate input parameters
      this.validateGenerationParameters(generateDto);

      // Extract inputType from data for model filtering
      const inputType = 'inputType' in data ? data.inputType : InputTypeEnum.TEXT_PROMPT;

      const planCode = (userRole || DEFAULT_USER_ROLE).toUpperCase();

      // Determine endpoints first to calculate correct credit cost
      let endpoints: string[];
      const compatibleModelDefs = await this.getModelsForInputType(inputType, planCode);
      const compatibleModels = compatibleModelDefs.map((m) => m.id);
      const modelMap = new Map(compatibleModelDefs.map((m) => [m.id, m]));
      let requestedModels: string[];
      if (selectedModels && selectedModels.length > 0) {
        // Filter selected models to only include those compatible with the input type
        requestedModels = selectedModels.filter((model) => compatibleModels.includes(model));

        // If no compatible models found after filtering, use default models for input type
        if (requestedModels.length === 0) {
          this.logger.warn(
            `None of the selected models are compatible with input type ${inputType}. Using default models.`,
          );
          requestedModels = compatibleModels;
        } else {
          this.logger.log(
            `Using ${requestedModels.length} compatible models from selection: ${requestedModels.join(', ')}`,
          );
        }
      } else {
        // No models selected, use defaults for input type
        requestedModels = compatibleModels;
        this.logger.log(
          `No models selected. Using default models for ${inputType}: ${requestedModels.join(', ')}`,
        );
      }

      // const { allowedModels, entitlements } =
      //   await this.entitlementService.filterAllowedModels(
      //     planCode,
      //     requestedModels,
      //     compatibleModels,
      //   );

      // let usingFallback = false;

      // if (allowedModels.length === 0) {
      //   // Fallback: use Bobby AI instead of blocking.
      //   this.logger.warn(
      //     `[FALLBACK] No available models for plan ${planCode}. Using Bobby AI fallback for user ${userId}`,
      //   );
      //   endpoints = [MODELS.PYTHON_VISION_LOCAL];
      //   usingFallback = true;
      // } else {
      //   // Only check resolution when not using fallback
      //   // this.entitlementService.ensureResolutionAllowed(
      //   //   entitlements,
      //   //   allowedModels,
      //   //   data?.['imageSize'] as string | undefined,
      //   // );
      // }

      endpoints = requestedModels;
      // For numImages > 1, create multiple jobs per model
      if (adjustedNumImages > 1) {
        endpoints = Array(adjustedNumImages).fill(endpoints).flat();
      }

      //Calculate total credits needed
      const allCredit = await this.creditSystemService.getRequiredCredits(
        endpoints,
        data.imageSize,
      );

      //Calculate total credits needed
      // const totalCreditsNeeded = endpoints.length * numImages;
      const hasEnoughCredits = await this.vizpointService.hasEnoughVizPoints(userId, allCredit);
      if (!hasEnoughCredits) {
        // Fallback: route to Bobby AI with a reduced generation count.
        this.logger.warn(
          `[FALLBACK] Insufficient credits for user ${userId}. Routing to Bobby AI with single generation.`,
        );
        // Reduce to single image using Bobby AI instead of blocking.
        if (adjustedNumImages > 1) {
          adjustedNumImages = 1;
          endpoints = [MODELS.PYTHON_VISION_LOCAL];
        }
      }

      // Create ImageRequest record in database
      let requestId: string;
      try {
        requestId = await this.createImageRequest(userId, method, {
          ...data,
          numImages: adjustedNumImages,
          projectId,
          folderId,
        });
        await this.updateImageRequestStatus(requestId, GenerationStatus.PROCESSING);
      } catch (dbError) {
        this.logger.warn(`Database unavailable, using fallback: ${dbError.message}`);
        // Fallback to generating a requestId
        requestId = randomUUID();
      }

      const jobIds = [];

      // Process all endpoints (models) individually
      for (let index = 0; index < endpoints.length; index++) {
        const endpoint = endpoints[index];

        // Generate unique job ID
        const jobId = randomUUID();
        jobIds.push(jobId);

        // Extract model name and provider from endpoint
        const modelDef = modelMap.get(endpoint);
        const modelName = this.extractModelName(endpoint);
        const provider = modelDef?.provider ?? this.extractProvider(endpoint);
        const connectorFunction =
          (modelDef as any)?.connectorFunction ?? modelDef?.metadata?.connectorFunction;

        // Create ImageJob record in database
        try {
          await this.createImageJob(jobId, requestId, modelName, provider);
        } catch (dbError) {
          this.logger.warn(`Failed to create ImageJob in database: ${dbError.message}`);
          // Continue with Redis-based tracking as fallback
        }

        const credit = await this.creditSystemService.getCreditsByModelAndQuality(
          endpoint,
          data.imageSize,
        );

        // Create job data for the queue
        const shouldWatermark = planCode === 'FREE';
        const jobData: ImageGenerationRequestDto = {
          jobId,
          requestId, // Pass requestId to worker so it can include it in webhook response
          generateImageParams: {
            userId,
            userEmail,
            data: {
              ...data,
              creativityValue: data.creativityValue + index,
            },
            credit: credit.credits,
            method: method as ImageGenerationMethod,
            projectId,
            folderId,
            shouldWatermark: shouldWatermark,
          },
          endpoint,
          provider,
          connectorFunction,
        };

        // Add job to queue with enhanced configuration
        await this.queue.add('image-generation', jobData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          delay: 0, // Immediate processing
          jobId: jobId, // Use our UUID as job ID
          removeOnComplete: true,
          removeOnFail: true,
        });

        try {
          await this.imageGenerationRepository.saveImageJobPayload(
            jobId,
            jobData as unknown as Record<string, unknown>,
          );
        } catch (payloadError) {
          this.logger.warn(
            `Failed to persist retry payload for job ${jobId}: ${payloadError.message}`,
          );
        }

        // Emit job status: initial queued (give small progress so frontend shows started)
        this.jobStatusGateway.emitJobStatus(jobId, JobStatus.WAITING, 10);

        // Set initial job status in Redis with additional metadata (10% at queue)
        await this.redisService.setJobStatus(jobId, 10, JobStatus.WAITING);
        await this.redisService.addUserJob(userId, jobId);

        // Enhanced metadata with batch tracking information
        const enhancedMetadata = {
          ...generateDto,
          requestId, // Include requestId in metadata for tracking
          credit: credit.credits,
          batchInfo: {
            totalJobs: endpoints.length,
            jobIndex: index,
            batchId: requestId, // Use requestId as batchId
            isBatch: adjustedNumImages > 1,
          },
          createdAt: new Date().toISOString(),
        };

        await this.redisService.setJobMetadata(jobId, enhancedMetadata);

        this.logger.log(
          `Image generation job ${jobId} queued for user ${userId} with method ${method}, endpoint ${endpoint}, and requestId ${requestId}`,
        );
      }

      return {
        jobIds,
        requestId,
        message: 'Image generation jobs queued successfully. Use the job IDs to check progress.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to queue image generation job: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Image generation failed',
          message: 'Failed to queue image generation job. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async retryGenerationJob(
    jobId: string,
    userRole?: string,
  ): Promise<ImageGenerationResponseDto> {
    if (!this.isValidUUID(jobId)) {
      throw new HttpException('Invalid job ID format', HttpStatus.BAD_REQUEST);
    }

    const existingJob = await this.imageGenerationRepository.getImageJobById(jobId);
    if (!existingJob) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    const status = toGenerationStatus(existingJob.status);
    if (![GenerationStatus.FAILED, GenerationStatus.CANCELLED].includes(status)) {
      throw new HttpException(
        `Only failed or cancelled jobs can be retried. Current status: ${status}`,
        HttpStatus.CONFLICT,
      );
    }

    const storedPayload =
      (existingJob.payload as Record<string, unknown> | undefined) ||
      (await this.imageGenerationRepository.getStoredJobPayload(jobId));

    if (!storedPayload) {
      throw new HttpException(
        'Stored retry payload is not available for this job',
        HttpStatus.CONFLICT,
      );
    }

    const originalPayload = storedPayload as unknown as ImageGenerationRequestDto;
    const originalParams = originalPayload.generateImageParams;
    if (!originalParams?.userId) {
      throw new HttpException(
        'Stored retry payload is missing generation parameters',
        HttpStatus.CONFLICT,
      );
    }

    const creditCost = originalParams.credit || 0;
    const hasEnoughCredits = await this.vizpointService.hasEnoughVizPoints(
      originalParams.userId,
      creditCost,
    );
    if (!hasEnoughCredits) {
      throw new HttpException(
        {
          status: HttpStatus.PAYMENT_REQUIRED,
          error: 'Insufficient credits',
          message: 'You do not have enough credits to retry this generation.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const newJobId = randomUUID();
    const requestId = originalPayload.requestId || existingJob.requestId;
    const retryPayload: ImageGenerationRequestDto = {
      ...originalPayload,
      jobId: newJobId,
      requestId,
      generateImageParams: {
        ...originalParams,
      },
    };

    await this.imageGenerationRepository.createImageJob({
      jobId: newJobId,
      requestId,
      modelName: existingJob.modelName,
      provider: existingJob.provider,
      payload: retryPayload as unknown as Record<string, unknown>,
    });

    await this.queue.add('image-generation', retryPayload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      delay: 0,
      jobId: newJobId,
      removeOnComplete: true,
      removeOnFail: true,
    });

    this.jobStatusGateway.emitJobStatus(newJobId, JobStatus.WAITING, 10);
    await this.redisService.setJobStatus(newJobId, 10, JobStatus.WAITING);
    await this.redisService.addUserJob(originalParams.userId, newJobId);
    await this.redisService.setJobMetadata(newJobId, {
      ...retryPayload,
      requestId,
      retriedFromJobId: jobId,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(
      `Retry job ${newJobId} queued for original job ${jobId} in request ${requestId}`,
    );

    return {
      jobIds: [newJobId],
      requestId,
      message: 'Image generation retry queued successfully. Use the job ID to check progress.',
    };
  }

  async cancelGenerationJob(jobId: string): Promise<{
    jobId: string;
    status: GenerationStatus.CANCELLED;
    removedFromQueue: boolean;
    message: string;
  }> {
    if (!this.isValidUUID(jobId)) {
      throw new HttpException('Invalid job ID format', HttpStatus.BAD_REQUEST);
    }

    const existingJob = await this.imageGenerationRepository.getImageJobById(jobId);
    const bullJob = await this.queue.getJob(jobId);

    if (!existingJob && !bullJob) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    const currentStatus = toGenerationStatus(existingJob?.status);
    if (currentStatus === GenerationStatus.COMPLETED) {
      throw new HttpException(
        'Completed jobs cannot be cancelled',
        HttpStatus.CONFLICT,
      );
    }

    if (currentStatus === GenerationStatus.CANCELLED) {
      return {
        jobId,
        status: GenerationStatus.CANCELLED,
        removedFromQueue: false,
        message: 'Generation job was already cancelled.',
      };
    }

    let removedFromQueue = false;
    if (bullJob) {
      const state = await bullJob.getState();
      if (['waiting', 'delayed', 'prioritized', 'paused'].includes(state)) {
        await bullJob.remove();
        removedFromQueue = true;
      }
    }

    await this.updateImageJobStatus(
      jobId,
      GenerationStatus.CANCELLED,
      'Generation cancelled by user',
    );
    await this.redisService.setJobStatus(
      jobId,
      0,
      JobStatus.FAILED,
      'Generation cancelled by user',
    );
    this.jobStatusGateway.emitJobStatus(
      jobId,
      'failed',
      0,
      undefined,
      'Generation cancelled by user',
    );
    await this.checkJobsStatus(jobId);

    return {
      jobId,
      status: GenerationStatus.CANCELLED,
      removedFromQueue,
      message: removedFromQueue
        ? 'Generation job cancelled and removed from the queue.'
        : 'Generation job marked as cancelled. A late worker result will be ignored.',
    };
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponseDto> {
    try {
      // Validate job ID format
      if (!this.isValidUUID(jobId)) {
        throw new HttpException('Invalid job ID format', HttpStatus.BAD_REQUEST);
      }

      const jobStatus = await this.redisService.getJobStatus(jobId);

      this.logger.debug(`Retrieved job status for ${jobId}: ${JSON.stringify(jobStatus)}`);
      if (!jobStatus || Object.keys(jobStatus).length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Job not found',
            message: 'The specified job ID was not found or has expired.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Parse error information if it exists
      let parsedError = null;
      if (jobStatus.error) {
        try {
          parsedError = JSON.parse(jobStatus.error);
        } catch {
          parsedError = { message: jobStatus.error };
        }
      }

      // Parse result information if it exists
      let parsedResult = null;
      if (jobStatus.result) {
        try {
          parsedResult = JSON.parse(jobStatus.result);
        } catch {
          parsedResult = jobStatus.result;
        }
      }
      return {
        jobId,
        status: jobStatus.status as JobStatus,
        progress: jobStatus.progress ? parseInt(jobStatus.progress.toString()) : 0,
        result: parsedResult,
        message: jobStatus.message,
        error: parsedError,
        createdAt: jobStatus.createdAt ? new Date(jobStatus.createdAt) : undefined,
        completedAt: jobStatus.completedAt ? new Date(jobStatus.completedAt) : undefined,
        metadata:
          typeof jobStatus.metadata === 'string'
            ? JSON.parse(jobStatus.metadata)
            : (jobStatus.metadata ?? {}),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get job status for ${jobId}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve job status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getJobResult(jobId: string): Promise<JobResultDto> {
    const jobStatus = await this.getJobStatus(jobId);

    if (jobStatus.status !== JobStatus.COMPLETED) {
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          error: 'Job not completed',
          message: `Job is currently ${jobStatus.status}. Please wait for completion.`,
          currentStatus: jobStatus.status,
          progress: jobStatus.progress,
        },
        HttpStatus.CONFLICT,
      );
    }

    if (!jobStatus.result) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Result not found',
          message: 'Job completed but result not found. The result may have expired.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return jobStatus.result;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to retrieve queue statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // TODO: Implement user job retrieval with pagination and filtering
  async getUserJobs(
    userId: string,
    limit = 20, // Currently not used
    inputType?: InputTypeEnum[],
    type?: string,
  ): Promise<JobStatusResponseDto[]> {
    try {
      const jobIds = await this.redisService.getUserJobIds(userId);

      const jobs = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const jobStatus = await this.getJobStatus(jobId);
            if (inputType && !inputType.includes(jobStatus.metadata.data.inputType)) {
              return null; // Skip jobs that don't match the input type filter
            }
            if (type && jobStatus.metadata.data.creationType !== type) {
              return null; // Skip jobs that don't match the type filter
            }
            return jobStatus;
          } catch {
            return null; // Skip jobs that no longer exist
          }
        }),
      );

      return jobs.filter((job) => job !== null) as JobStatusResponseDto[];
    } catch (error) {
      this.logger.error(`Failed to get user jobs for ${userId}: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve user jobs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: string;
    details: Record<string, unknown>;
  }> {
    try {
      const [redisHealth, queueHealth] = await Promise.all([
        this.redisService.isHealthy(),
        this.checkQueueHealth(),
      ]);

      const isHealthy = redisHealth && queueHealth.healthy;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          redis: redisHealth ? 'connected' : 'disconnected',
          queue: queueHealth,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  async verifyWebhookSignature(signature: string): Promise<boolean> {
    const webhookSecret = this.imageGenerationConfigService.webhookSecret;
    return signature === webhookSecret;
  }

  private filterUnavailableProviderModels(
    models: ModelCatalogResponseDto[],
  ): ModelCatalogResponseDto[] {
    return models.filter((model) => model.provider?.toLowerCase() === 'python' || model.id.startsWith('python-'));
  }

  private async getModelsForInputType(
    inputType: InputTypeEnum,
    planCode: string,
  ): Promise<ModelCatalogResponseDto[]> {
    const catalog = await this.modelCatalogService.getCatalogForPlan(planCode);
    const generationModels = catalog.filter(
      (model) =>
        model.metadata?.actionTypes?.includes(ACTION_TYPES.IMAGE_GENERATION) &&
        !model.metadata?.isVideo,
    );

    if (this.useBobbyAiOnly) {
      const pythonModels = generationModels.filter(
        (model) => model.provider?.toLowerCase() === 'python' || model.id.startsWith('python-'),
      );

      if (pythonModels.length > 0) {
        return pythonModels;
      }

      this.logger.warn(
        'BOBBY_AI_ONLY is enabled but no Bobby AI model was found in catalog. Falling back to regular models.',
      );
    }

    return this.filterUnavailableProviderModels(generationModels);
  }

  private async checkQueueHealth(): Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
  }> {
    try {
      const stats = await this.getQueueStats();
      return {
        healthy: true,
        details: stats,
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  }

  private validateGenerationParameters(
    generateDto: GenerateImageDTO<
      TextToImageDto | ImageToImageDto | LineDrawingToImageDto | ImageUpscalingDto
    >,
  ): void {
    this.logger.debug(`Generating image with parameters: ${JSON.stringify(generateDto)}`);

    if (!generateDto.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!generateDto.method) {
      throw new HttpException('Generation method is required', HttpStatus.BAD_REQUEST);
    }

    // Data should be present now (normalized by generateImage)
    if (!generateDto.data) {
      throw new HttpException('Data is required', HttpStatus.BAD_REQUEST);
    }

    if (!generateDto.data?.imageSize) {
      throw new HttpException('Image size is required', HttpStatus.BAD_REQUEST);
    }

    // Validate image size format
    // const sizeRegex = /^\d+:\d+$/;
    // if (!sizeRegex.test(generateDto.data.imageSize)) {
    //   throw new HttpException(
    //     'Invalid image size format. Use format like "21:9"',
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    // Validate creativity level
    if (generateDto.data.creativityValue !== undefined) {
      if (
        typeof generateDto.data.creativityValue !== 'number' ||
        generateDto.data.creativityValue < 0 ||
        generateDto.data.creativityValue > 999999999
      ) {
        throw new HttpException(
          'Creativity must be a number between 0 and 999999999',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Validate style level
    if (generateDto.data.styleValue !== undefined) {
      if (
        typeof generateDto.data.styleValue !== 'number' ||
        generateDto.data.styleValue < 0 ||
        generateDto.data.styleValue > 2
      ) {
        throw new HttpException('Style must be a number between 0 and 2', HttpStatus.BAD_REQUEST);
      }
    }

    // Validate input value
    if (generateDto.data.inputValue !== undefined) {
      if (
        typeof generateDto.data.inputValue !== 'number' ||
        generateDto.data.inputValue < 0 ||
        generateDto.data.inputValue > 100
      ) {
        throw new HttpException(
          'Input value must be a number between 0 and 100',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Method-specific validations
    if (
      generateDto.method.includes('TEXT_TO_IMAGE') &&
      !(
        'prompt' in generateDto.data &&
        typeof generateDto.data.prompt === 'string' &&
        generateDto.data.prompt
      )
    ) {
      throw new HttpException(
        'Prompt is required for text to image generation',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      generateDto.method.includes('IMAGE_TO_IMAGE') &&
      (!('imageId' in generateDto.data && generateDto.data.imageId) ||
        !('imagePath' in generateDto.data && generateDto.data.imagePath))
    ) {
      throw new HttpException(
        'Image ID and path are required for image to image generation',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      generateDto.method.includes('UPSCALING') &&
      !('upscaleBy' in generateDto.data && generateDto.data.upscaleBy)
    ) {
      throw new HttpException(
        'Upscale factor is required for image upscaling',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  async handleGenerateWebhook(
    signature: string,
    webhookData: Record<string, unknown>,
    jobId?: string,
  ): Promise<{ status: string }> {
    try {
      const expectedSecret = process.env.IMAGE_GENERATION_WEBHOOK_SECRET;
      // if (signature !== expectedSecret && !webhookData.webhook_events_filter) {
      //   this.logger.warn('Invalid webhook signature received');
      //   return { status: 'unauthorized' };
      // }

      const provider = this.determineProvider(webhookData);
      this.logger.log(`📥 Received webhook from provider: ${provider}`);

      switch (provider) {
        case 'python':
          return await this.handlePythonWebhook(webhookData, jobId);
        case 'worker':
          return await this.handleWorkerWebhook(webhookData);
        default:
          this.logger.warn(`Unknown provider in webhook data: ${JSON.stringify(webhookData)}`);
          return { status: 'unknown_provider' };
      }
    } catch (error) {
      this.logger.error(`Failed to handle webhook: ${error.message}`);
      return { status: 'error' };
    }
  }

  private determineProvider(webhookData: Record<string, unknown>): string {
    // Check for worker events (has 'event' property with specific values)
    if (webhookData.event && typeof webhookData.event === 'string') {
      const event = webhookData.event as string;
      if (
        ['job.completed', 'job.failed', 'job.active', 'job.progress', 'job.cancelled', 'health.check'].includes(
          event,
        )
      ) {
        return 'worker';
      }
    }

    if (webhookData.provider === 'python') {
      return 'python';
    }

    return 'python';
  }

  private async handlePythonWebhook(
    pythonWebhookData: Record<string, unknown>,
    jobId?: string,
  ): Promise<{ status: string }> {
    try {
      const status = pythonWebhookData.status as string;

      this.logger.log(
        `📥 Processing Python webhook: ${status}${jobId ? ` (jobId: ${jobId})` : ''}`,
      );

      if (status === 'SUCCESS' && pythonWebhookData.result) {
        const result = pythonWebhookData.result as Record<string, unknown>;
        if (result.image_url) {
          const targetJobId = jobId;

          if (targetJobId) {
            await this.handleBobbyImageReady(targetJobId, result.image_url as string);

            await this.checkJobsStatus(targetJobId);
          } else {
            this.logger.error(`No job found for Python job ID: ${jobId}`);
          }
        }
      } else if (status === 'FAILED' || status === 'ERROR') {
        if (jobId) {
          await this.redisService.setJobStatus(jobId, 100, JobStatus.FAILED);
          await this.updateImageJobStatus(jobId, GenerationStatus.FAILED, 'Job failed from Python webhook');
          await this.checkJobsStatus(jobId);
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Failed to handle Python webhook: ${error.message}`);
      return { status: 'error' };
    }
  }

  private async handleWorkerWebhook(
    workerWebhookData: Record<string, unknown>,
  ): Promise<{ status: string }> {
    try {
      const event = workerWebhookData.event as string;
      if (event === eventType.JOB_COMPLETED) {
        const payload = workerWebhookData.data as ImageGenerationJobResultData;

        const jobId = payload.jobId;

        if (!jobId) {
          this.logger.warn('Job completed webhook missing jobId');
          return { status: 'bad_request' };
        }

        // Check if this job is part of a batch using database tracking
        const jobStatus = await this.redisService.getJobStatus(jobId);
        if (jobStatus && jobStatus.metadata && jobStatus.metadata.requestId) {
          await this.checkJobsStatus(jobId);
        }

        // Handle completion and cleanup AFTER batch check
        await this.handleWorkerJobCompleted(payload as ImageGenerationJobResultData);

        return { status: 'ok' };
      }

      if (event === eventType.JOB_ACTIVE || event === eventType.JOB_PROGRESS) {
        const payload = workerWebhookData.data as {
          jobId?: string;
          progress?: number;
          error?: { message?: string };
        };
        const jobId = payload?.jobId;

        if (!jobId) {
          this.logger.warn(`${event} webhook missing jobId`);
          return { status: 'bad_request' };
        }

        const progress = Number(payload.progress ?? (event === eventType.JOB_ACTIVE ? 20 : 50));
        await this.redisService.setJobStatus(
          jobId,
          progress,
          event === eventType.JOB_ACTIVE ? JobStatus.ACTIVE : JobStatus.PROGRESS,
        );
        await this.updateImageJobStatus(jobId, GenerationStatus.PROCESSING);
        this.jobStatusGateway.emitJobStatus(
          jobId,
          event === eventType.JOB_ACTIVE ? 'active' : 'progress',
          progress,
        );

        return { status: 'ok' };
      }

      if (event === eventType.JOB_FAILED) {
        const failedData = workerWebhookData.data as {
          jobId?: string;
          error?: { message?: string; timestamp?: string };
        };
        const jobId = failedData?.jobId as string;
        const errorData = failedData?.error;
        const errorMessage = errorData?.message || 'Job failed during processing';

        if (!jobId) {
          this.logger.warn('Job failed webhook missing jobId');
          return { status: 'bad_request' };
        }

        this.logger.error(`Job ${jobId} failed: ${errorMessage}`);

        // Update job status to failed
        await this.redisService.setJobStatus(jobId, 0, JobStatus.FAILED);

        // Update database status
        await this.updateImageJobStatus(jobId, GenerationStatus.FAILED, errorMessage);

        // Notify client via WebSocket with error message
        this.jobStatusGateway.emitJobStatus(jobId, 'failed', 0, undefined, errorMessage);

        // Check batch status in case other jobs in batch succeeded
        const jobStatus = await this.redisService.getJobStatus(jobId);
        if (jobStatus && jobStatus.metadata && jobStatus.metadata.requestId) {
          await this.checkJobsStatus(jobId);
        }

        return { status: 'ok' };
      }

      if (event === eventType.JOB_CANCELLED) {
        const cancelledData = workerWebhookData.data as { jobId?: string; reason?: string };
        const jobId = cancelledData?.jobId as string;
        const reason = cancelledData?.reason || 'Generation cancelled';

        if (!jobId) {
          this.logger.warn('Job cancelled webhook missing jobId');
          return { status: 'bad_request' };
        }

        await this.redisService.setJobStatus(jobId, 0, JobStatus.FAILED, reason);
        await this.updateImageJobStatus(jobId, GenerationStatus.CANCELLED, reason);
        this.jobStatusGateway.emitJobStatus(jobId, 'failed', 0, undefined, reason);
        await this.checkJobsStatus(jobId);

        return { status: 'ok' };
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Failed to handle worker webhook: ${error.message}`);
      return { status: 'error' };
    }
  }

  private async handleBobbyImageReady(jobId: string, imageUrl: string): Promise<void> {
    const startTime = Date.now();
    try {
      // Get job status data using the job ID directly
      const jobStatusData = await this.redisService.getJobStatus(jobId);

      // Check if job is already processed or post-processing already started (idempotency check)
      if (toGenerationStatus(jobStatusData?.status) === GenerationStatus.COMPLETED) {
        this.logger.log(`Job ${jobId} already completed, skipping processing`);
        return;
      }

      const existingJob = await this.imageGenerationRepository.getImageJobById(jobId);
      if (toGenerationStatus(existingJob?.status) === GenerationStatus.CANCELLED) {
        this.logger.warn(`Skipping Python image-ready webhook for cancelled job ${jobId}`);
        return;
      }

      // Check if post-processing is already in progress (progress >= 50)
      const currentProgress = parseInt(jobStatusData?.progress?.toString() || '0');
      if (currentProgress >= 50) {
        this.logger.log(
          `Job ${jobId} post-processing already started (progress: ${currentProgress}%), skipping duplicate processing`,
        );
        return;
      }

      if (!jobStatusData?.metadata) {
        throw new Error(`No job metadata found for job ${jobId}`);
      }

      this.logger.log(`🔄 Processing Bobby AI image ready for job ${jobId} from URL: ${imageUrl}`);

      // Parse metadata
      const metadata =
        typeof jobStatusData.metadata === 'string'
          ? JSON.parse(jobStatusData.metadata)
          : jobStatusData.metadata;

      // Extract user info from the correct location in metadata
      const originalGenerateImageParams = metadata.generateImageParams || {};
      const userId = originalGenerateImageParams.userId || metadata.userId || 'unknown';
      const userEmail =
        originalGenerateImageParams.userEmail || metadata.userEmail || 'unknown@example.com';
      const originalData = originalGenerateImageParams.data || metadata.data || {};

      // Construct generateImageParams from metadata since it's not nested under generateImageParams
      const generateImageParams = {
        userId: userId,
        userEmail: userEmail,
        method: originalGenerateImageParams.method || metadata.method,
        data: originalData,
        projectId: originalGenerateImageParams.projectId || metadata.projectId,
        folderId: originalGenerateImageParams.folderId || metadata.folderId,
      };
      // Determine watermark flag from metadata or original params
      const shouldWatermark =
        metadata?.shouldWatermark ?? originalGenerateImageParams?.shouldWatermark ?? false;

      // Enqueue a post-processing job for the worker
      const postJob = {
        jobId,
        requestId: metadata.requestId, // Pass requestId for batch grouping
        userId: userId,
        userEmail: userEmail,
        sourceJobId: jobId,
        imageUrl: imageUrl,
        generateImageParams: generateImageParams,
        method: originalGenerateImageParams.method || metadata.method,
        credit: metadata.credit,
        endpoint: metadata.endpoint || 'python-vision-local',
        shouldWatermark,
        metadata: {
          creativityValue: originalData?.creativityValue,
          inputValue: originalData?.inputValue,
          styleValue: originalData?.styleValue,
          aspectRatio: originalData?.aspectRatio || '1:1',
          lora: originalData?.lora,
        },
      };
      await this.postProcessingQueue.add('post-process', postJob, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        delay: 0,
        removeOnComplete: true,
        removeOnFail: true,
      });

      this.logger.log(
        `✅ Bobby AI image post-processing queued for job ${jobId} (${Date.now() - startTime}ms)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Bobby AI image ready for job ${jobId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async handleWorkerJobCompleted(data: ImageGenerationJobResultData): Promise<void> {
    try {
      // Use the typed job result provided by the worker
      const jobResult = data;
      const { jobId, requestId: resultRequestId, generateImageParams, generatedImage } = jobResult;
      this.logger.log(`📦 Processing worker job completion for ${jobId}`);

      const existingJob = await this.imageGenerationRepository.getImageJobById(jobId);
      const existingStatus = toGenerationStatus(existingJob?.status);
      if (existingStatus === GenerationStatus.CANCELLED) {
        this.logger.warn(`Ignoring late completion for cancelled job ${jobId}`);
        await this.redisService.setJobStatus(
          jobId,
          0,
          JobStatus.FAILED,
          'Generation was cancelled',
        );
        return;
      }

      if (existingStatus === GenerationStatus.COMPLETED) {
        this.logger.log(`Ignoring duplicate completion webhook for job ${jobId}`);
        return;
      }

      // Use requestId from the result data (passed through from worker)
      // Fall back to Redis metadata if not present (legacy support)
      let requestId = resultRequestId;

      if (!requestId) {
        const jobStatus = await this.redisService.getJobStatus(jobId);
        requestId = jobStatus?.metadata?.requestId;
      }

      // Create GenerateImageResponse structure expected by frontend
      const generateImageResponse = {
        userId: generateImageParams.userId,
        attributeId: jobResult.attributeId,
        version: jobResult.version,
        jobId,
        requestId, // Include for batch grouping in frontend
        createdAt: new Date().toISOString(), // Include timestamp for proper sorting
        imagePath: generatedImage.location,
        generatedImage: Object.assign(
          {
            location: generatedImage.location,
            eTag: generatedImage.eTag,
            bucket: generatedImage.bucket,
            key: generatedImage.key,
            thumbnail: generatedImage.thumbnail,
            dimensions: generatedImage.dimensions,
            creationType: generatedImage.creationType,
            inputType: generatedImage.inputType,
            selectedStyle: generatedImage.selectedStyle,
            prompt: generatedImage.prompt,
          },
          generatedImage.original
            ? {
                original: {
                  location: generatedImage.original.location,
                  eTag: generatedImage.original.eTag,
                  bucket: generatedImage.original.bucket,
                  thumbnail: generatedImage.original.thumbnail,
                },
              }
            : {},
        ),
        method: generateImageParams.method || jobResult.method,
        // Include model information for multi-model tracking
        model: (data as ImageGenerationJobResultData & { model?: string }).model,
        modelIndex: (data as ImageGenerationJobResultData & { modelIndex?: number }).modelIndex,
        parentJobId: (data as ImageGenerationJobResultData & { parentJobId?: string }).parentJobId,
      };

      // Sequential operations: database storage first, then websocket notification
      // Store the processed result to database FIRST
      await this.handleJobCompleted({
        jobId,
        attributeId: jobResult.attributeId,
        version: jobResult.version,
        generateImageParams,
        generatedImage: Object.assign(
          {
            location: generatedImage.location,
            key: generatedImage.key,
            thumbnail: generatedImage.thumbnail,
            dimensions: generatedImage.dimensions,
            eTag: generatedImage.eTag,
            bucket: generatedImage.bucket,
          },
          generatedImage.original
            ? {
                original: {
                  location: generatedImage.original.location,
                  eTag: generatedImage.original.eTag,
                  bucket: generatedImage.original.bucket,
                  thumbnail: generatedImage.original.thumbnail,
                },
              }
            : {},
        ),

        credit: jobResult.credit,
        method: generateImageParams.method || jobResult.method,
        generatedAt: new Date(jobResult.generatedAt),
      });

      // Persist result payload so GET /job/:jobId/result works reliably.
      await this.redisService.setJobResult(jobId, generateImageResponse);

      // THEN emit websocket event with GenerateImageResponse structure for the frontend
      this.jobStatusGateway.emitJobStatus(jobId, 'completed', 100, generateImageResponse);

      // Update Redis status to completed before batch check
      await this.redisService.setJobStatus(jobId, 100, JobStatus.COMPLETED);

      this.logger.log(
        `✅ Worker job completion processed for ${jobId} - stored Google Storage URLs to database`,
      );

      // Check for batch completion using requestId
      if (requestId) {
        const batchCompleted = await this.checkBatchCompletion(requestId);
        if (batchCompleted) {
          this.logger.log(`Batch ${requestId} completed via worker`);
        }
      } else {
        // Fallback: try to get requestId from database
        try {
          const dbRequestId = await this.imageGenerationRepository.getRequestIdFromJobId(jobId);

          if (dbRequestId) {
            const batchCompleted = await this.checkBatchCompletion(dbRequestId);
            if (batchCompleted) {
              this.logger.log(`Batch ${dbRequestId} completed via database lookup from worker`);
            }
          }
        } catch (dbError) {
          this.logger.warn(
            `Could not lookup requestId from database in worker completion: ${dbError.message}`,
          );
          // For fallback, just check batch completion with jobId
          await this.checkJobsStatus(jobId);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process worker job completion: ${error.message}`);
    }
  }
}
