import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttributeTypeEnum } from '../../constant/attribute-type.enum';
import { ApiException } from './api-error';
import { GenerationMode, SaveGenerationResponse } from './contracts';
import { JobPayload } from './job-payload';
import { GenerationQueries } from './generation-queries';
import { lockJob } from './job-store';

const METHOD_LABEL: Record<GenerationMode, string> = {
  text_to_image: 'Text to Image',
  sketch_to_image: 'Line Drawing to Image',
  image_to_image: 'Image to Image',
};

/**
 * Keeps a completed preview: promotes its assets out of preview retention and records them in the
 * library. No inference happens. Idempotent: repeating it returns the same library item.
 */
@Injectable()
export class SaveGenerationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queries: GenerationQueries,
  ) {}

  async execute(userId: string, jobId: string): Promise<SaveGenerationResponse> {
    const libraryItemId = await this.prisma.$transaction(async (tx) => {
      const job = await lockJob(tx, jobId);
      if (!job || job.userId !== userId) throw new ApiException(404, 'NOT_FOUND', 'Generation not found');
      if (job.status !== 'COMPLETED') throw new ApiException(409, 'INVALID_INPUT', 'Only completed generations can be saved');

      const assets = await tx.asset.findMany({ where: { jobId, kind: 'output' }, orderBy: { outputIndex: 'asc' } });
      if (assets.length === 0) throw new ApiException(404, 'NOT_FOUND', 'Generation has no result');
      const alreadySaved = assets.every((asset) => asset.retention === 'saved');
      if (!alreadySaved && assets.some((asset) => asset.expiresAt && asset.expiresAt.getTime() < Date.now())) {
        throw new ApiException(410, 'EXPIRED', 'This preview has expired; generate it again');
      }

      await tx.asset.updateMany({ where: { jobId, kind: 'output' }, data: { retention: 'saved', expiresAt: null } });
      await tx.imageJob.update({ where: { id: jobId }, data: { savedAt: job.savedAt ?? new Date(), expiresAt: null } });

      const existing = await tx.attribute.findFirst({ where: { jobId, type: AttributeTypeEnum.GENERATED_IMAGE }, select: { id: true } });
      if (existing) return existing.id;

      const payload = job.payload as unknown as JobPayload;
      const first = assets[0];
      const attributeId = randomUUID();
      const version = randomUUID();
      await tx.attribute.create({
        data: {
          id: attributeId,
          version,
          jobId,
          type: AttributeTypeEnum.GENERATED_IMAGE,
          value: {
            key: first.storageKey,
            assetId: first.id,
            path: `/api/assets/${first.id}/content`,
            thumbnail: `/api/assets/${first.id}/content?thumbnail=true`,
            dimensions: `${first.width}x${first.height}`,
          },
          actions: {
            createdAt: new Date().toISOString(),
            jobId,
            method: METHOD_LABEL[payload.mode],
            generateImageParams: {
              userId,
              data: { prompt: payload.prompt, modelId: payload.modelId, width: payload.size.width, height: payload.size.height, quality: payload.quality },
            },
          },
        },
      });
      await tx.attributeVersion.create({ data: { id: attributeId, version, isActive: true, isPublished: false } });
      await tx.userAttribute.create({ data: { userId, attributeId } });
      return attributeId;
    });
    return { generation: await this.queries.get(userId, jobId), libraryItemId };
  }
}
