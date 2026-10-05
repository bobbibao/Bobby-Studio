import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ImageService } from './image.service';
import { Public } from '../auth/public.decorator';
import { AssetAccessService } from '../assets/asset-access.service';
import { AttributeService } from '../attribute/attribute.service';
import { PrincipalService } from '../identity/principal.service';
import sharp = require('sharp');

const MAX_QUALITY_FORMATS = new Set(['webp', 'jpg']);

@Controller('images')
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    private readonly access: AssetAccessService,
    private readonly principals: PrincipalService,
    private readonly attributes: AttributeService,
  ) {}

  /**
   * Library image delivery. Authorized by a short-lived signed `access` token (for <img> tags) or
   * by a Bearer token whose user owns the image or sees it published. There is no anonymous access.
   */
  @Get(':id')
  @Public()
  async getImage(
    @Param('id') id: string,
    @Query('access') access: string,
    @Query('thumbnail') thumbnail: string,
    @Query('format') requestedFormat: string = 'webp',
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const format = MAX_QUALITY_FORMATS.has(requestedFormat) ? requestedFormat : 'webp';
    if (!(await this.isAuthorized(id, access, req))) {
      return res.status(404).send('Image not found');
    }

    try {
      const stream = await this.imageService.getImageStream(
        id,
        thumbnail === 'true',
      );

      if (req.headers['if-none-match'] === id) {
        return res.status(304).send();
      }

      res.set({
        'Content-Disposition': `inline; filename="${id}"`,
        // Private: the same URL is authorized per request, so shared caches must not keep it.
        'Cache-Control': 'private, max-age=300',
        ETag: id,
      });

      if (format === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg');

        stream
          .pipe(sharp().jpeg({ quality: 90, progressive: true }))
          .pipe(res)
          .on('error', (err) => {
            console.error('Error streaming JPG:', err);
            res.status(500).send('Error converting image');
          });
      } else {
        res.setHeader('Content-Type', 'image/webp');
        stream
          .pipe(sharp().webp({ quality: 90 }))
          .pipe(res)
          .on('error', (err) => {
            console.error('Error streaming image:', err);
            res.status(500).send('Error streaming image');
          });
      }
    } catch (error) {
      return res.status(404).send('Image not found');
    }
  }

  private async isAuthorized(id: string, access: string | undefined, req: Request): Promise<boolean> {
    if (this.access.verify(id, access)) return true;
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) return false;
    try {
      const user = await this.principals.authenticateToken(match[1].trim());
      return await this.attributes.canReadAttribute(user.id, id);
    } catch {
      return false;
    }
  }
}
