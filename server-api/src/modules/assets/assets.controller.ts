import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseInterceptors, NotFoundException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UploadResponse } from '../../application/generation/contracts';
import { imageUploadOptions } from '../../shared/upload/image-upload.options';
import { Public } from '../auth/public.decorator';
import { AuthenticatedRequest } from '../identity/principal';
import { PrincipalService } from '../identity/principal.service';
import { AssetAccessService } from './asset-access.service';
import { AssetService } from './asset.service';

@ApiTags('Assets')
@Controller()
export class AssetsController {
  constructor(
    private readonly assets: AssetService,
    private readonly access: AssetAccessService,
    private readonly principals: PrincipalService,
  ) {}

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { ...imageUploadOptions, limits: { ...imageUploadOptions.limits, files: 1 } }))
  upload(@Request() req: AuthenticatedRequest, @UploadedFile() file?: Express.Multer.File): Promise<UploadResponse> {
    if (!file) throw new NotFoundException('No file provided');
    return this.assets.registerUpload(req.currentUser.id, file.buffer);
  }

  /** Metadata for the owner, with a fresh short-lived URL. */
  @Get('assets/:id')
  async describe(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.assets.getOwned(id, req.currentUser.id);
    return {
      assetId: asset.id,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      byteSize: asset.byteSize,
      saved: asset.retention === 'saved',
      expiresAt: asset.expiresAt,
      url: this.assets.signedUrl(asset.id),
    };
  }

  /** Content delivery: a valid signed `access` token, or a Bearer token of the owner. Never anonymous. */
  @Get('assets/:id/content')
  @Public()
  async content(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('access') accessToken: string | undefined,
    @Query('thumbnail') thumbnail: string | undefined,
    @Query('download') download: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    let allowed = this.access.verify(id, accessToken);
    if (!allowed) {
      const match = /^Bearer\s+(.+)$/i.exec((req.headers.authorization ?? '').trim());
      if (match) {
        try {
          const user = await this.principals.authenticateToken(match[1].trim());
          await this.assets.getOwned(id, user.id);
          allowed = true;
        } catch {
          allowed = false;
        }
      }
    }
    if (!allowed) throw new NotFoundException('Asset not found');

    const asset = await this.assets.getForDelivery(id);
    const { bytes, mimeType } = await this.assets.readBytes(asset, thumbnail === 'true');
    res.set({
      'Content-Type': mimeType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      ...(download === 'true' ? { 'Content-Disposition': `attachment; filename="bobby-${asset.id}.${mimeType === 'image/webp' ? 'webp' : asset.mimeType.split('/')[1]}"` } : {}),
    });
    res.send(bytes);
  }
}
