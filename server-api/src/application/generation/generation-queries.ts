import { Injectable } from '@nestjs/common';
import { Asset, ImageJob, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssetService } from '../../modules/assets/asset.service';
import { ApiException } from './api-error';
import { GenerationPage, GenerationSnapshot } from './contracts';
import { SnapshotAsset, toSnapshot } from './snapshot';

const MAX_PAGE = 50;

export const encodeCursor = (job: Pick<ImageJob, 'createdAt' | 'id'>): string =>
  Buffer.from(`${job.createdAt.toISOString()}|${job.id}`).toString('base64url');

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [iso, id, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const createdAt = new Date(iso);
  return rest.length === 0 && id && !Number.isNaN(createdAt.getTime()) ? { createdAt, id } : null;
}

@Injectable()
export class GenerationQueries {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetService,
  ) {}

  /** A job that is not the caller's is indistinguishable from a missing one. */
  async get(userId: string, jobId: string): Promise<GenerationSnapshot> {
    const job = await this.prisma.imageJob.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) throw new ApiException(404, 'NOT_FOUND', 'Generation not found');
    const [snapshot] = await this.snapshots([job]);
    return snapshot;
  }

  async list(
    userId: string,
    options: { cursor?: string; limit?: number; studioSessionId?: string },
  ): Promise<GenerationPage> {
    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 20) || 20, 1), MAX_PAGE);
    const cursor = options.cursor ? decodeCursor(options.cursor) : null;
    if (options.cursor && !cursor) throw new ApiException(400, 'INVALID_INPUT', 'Invalid cursor');

    const where: Prisma.ImageJobWhereInput = { userId };
    if (options.studioSessionId) {
      where.studioSessionId = options.studioSessionId;
    } else {
      // Library-oriented history: explicit finals and any preview the user kept.
      where.OR = [{ intent: 'final' }, { savedAt: { not: null } }];
    }
    if (cursor) {
      where.AND = [
        { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] },
      ];
    }
    const rows = await this.prisma.imageJob.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return {
      items: await this.snapshots(page),
      nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null,
    };
  }

  async snapshots(jobs: ImageJob[]): Promise<GenerationSnapshot[]> {
    const completedIds = jobs.filter((job) => job.status === 'COMPLETED').map((job) => job.id);
    const assets = completedIds.length
      ? await this.prisma.asset.findMany({ where: { jobId: { in: completedIds }, kind: 'output' }, orderBy: { outputIndex: 'asc' } })
      : [];
    const byJob = new Map<string, Asset[]>();
    for (const asset of assets) byJob.set(asset.jobId!, [...(byJob.get(asset.jobId!) ?? []), asset]);
    return jobs.map((job) =>
      toSnapshot(
        job,
        (byJob.get(job.id) ?? []).map<SnapshotAsset>((asset) => ({
          asset,
          url: this.assets.signedUrl(asset.id),
          thumbnailUrl: this.assets.signedUrl(asset.id, { thumbnail: true }),
        })),
      ),
    );
  }
}
