import { BadRequestException, GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as sharp from 'sharp';
import { Asset } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadResponse } from '../../application/generation/contracts';
import { INPUT_RETENTION_MS } from '../../domain/generation/job-state';
import { ASSET_STORAGE, AssetStorage } from '../../infrastructure/storage/asset-storage';
import { RUNTIME_CONFIG, RuntimeConfig } from '../../config/runtime-config';
import { AssetAccessService } from './asset-access.service';

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 16_000_000;
const FORMATS: Record<string, { mime: string; ext: string }> = {
  png: { mime: 'image/png', ext: 'png' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  webp: { mime: 'image/webp', ext: 'webp' },
};

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AssetAccessService,
    @Inject(ASSET_STORAGE) private readonly storage: AssetStorage,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  /** Short-lived URL for <img src> and downloads; minted only inside already authorized responses. */
  signedUrl(assetId: string, options: { thumbnail?: boolean; ttlSeconds?: number } = {}): string {
    const token = this.access.sign(assetId, options.ttlSeconds);
    const query = new URLSearchParams({ access: token });
    if (options.thumbnail) query.set('thumbnail', 'true');
    return `${this.config.publicApiUrl}/api/assets/${assetId}/content?${query.toString()}`;
  }

  /** Refresh local asset paths in owned library responses without changing stored references. */
  async withOwnedAssetUrls<T>(data: T, userId: string): Promise<T> {
    const urls = new Map<string, Promise<string>>();
    const apiOrigin = new URL(this.config.publicApiUrl).origin;
    const visit = async (value: unknown): Promise<unknown> => {
      if (Array.isArray(value)) return Promise.all(value.map(visit));
      if (!value || typeof value !== 'object' || value instanceof Date) return value;
      const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => {
        if (['path', 'thumbnail', 'imagePath'].includes(key) && typeof child === 'string') {
          let url: URL;
          try { url = new URL(child, apiOrigin); } catch { return [key, child]; }
          const match = /^\/api\/assets\/([0-9a-f-]{36})\/content$/i.exec(url.pathname);
          if (url.origin === apiOrigin && match) {
            const id = match[1];
            const thumbnail = key === 'thumbnail' || url.searchParams.get('thumbnail') === 'true';
            const cacheKey = `${id}:${thumbnail}`;
            if (!urls.has(cacheKey)) urls.set(cacheKey, this.getOwned(id, userId).then(() => this.signedUrl(id, { thumbnail })));
            return [key, await urls.get(cacheKey)];
          }
        }
        return [key, await visit(child)];
      }));
      return Object.fromEntries(entries);
    };
    return await visit(data) as T;
  }

  /**
   * Validates and stores an uploaded input image. The declared type is ignored: the bytes are decoded
   * (bounded by pixel count) and only real PNG/JPEG/WebP images are accepted.
   */
  async registerUpload(userId: string, bytes: Buffer): Promise<UploadResponse> {
    if (bytes.length === 0 || bytes.length > MAX_INPUT_BYTES) throw new BadRequestException('Image must be between 1 byte and 10 MiB');
    let meta: sharp.Metadata;
    try {
      meta = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      // Force a full decode of one frame so truncated or hostile files are rejected here, not by a provider.
      await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).resize(8, 8, { fit: 'inside' }).raw().toBuffer();
    } catch {
      throw new BadRequestException('The file is not a valid image within the allowed size');
    }
    const format = FORMATS[meta.format ?? ''];
    if (!format || !meta.width || !meta.height || (meta.pages ?? 1) > 1) {
      throw new BadRequestException('Only single-frame PNG, JPEG and WebP images are accepted');
    }

    const assetId = randomUUID();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const storageKey = `inputs/${userId}/${assetId}.${format.ext}`;
    await this.storage.put(storageKey, bytes, format.mime);
    await this.prisma.asset.create({
      data: {
        id: assetId,
        ownerId: userId,
        kind: 'input',
        storageKey,
        mimeType: format.mime,
        byteSize: bytes.length,
        sha256,
        width: meta.width,
        height: meta.height,
        retention: 'input',
        expiresAt: new Date(Date.now() + INPUT_RETENTION_MS),
      },
    });
    return { assetId, mimeType: format.mime, width: meta.width, height: meta.height, byteSize: bytes.length, sha256, url: this.signedUrl(assetId) };
  }

  /** Owner lookup that treats foreign or missing assets identically. */
  async getOwned(assetId: string, userId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.ownerId !== userId) throw new NotFoundException('Asset not found');
    return asset;
  }

  async getForDelivery(assetId: string): Promise<Asset> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.retention !== 'saved' && asset.expiresAt && asset.expiresAt.getTime() < Date.now()) {
      throw new GoneException({ code: 'ASSET_EXPIRED', message: 'This asset has expired' });
    }
    return asset;
  }

  async readBytes(asset: Asset, thumbnail: boolean): Promise<{ bytes: Buffer; mimeType: string }> {
    const original = await this.storage.read(asset.storageKey);
    if (!thumbnail) return { bytes: original, mimeType: asset.mimeType };
    const bytes = await sharp(original, { limitInputPixels: 64_000_000 })
      .resize(384, 384, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { bytes, mimeType: 'image/webp' };
  }
}
