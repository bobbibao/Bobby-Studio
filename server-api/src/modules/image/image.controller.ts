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
import { AuthGuard } from '../auth/auth.guard';
import * as admin from 'firebase-admin';
@Controller('images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get(':id')
  async getImage(
    @Param('id') id: string,
    @Query('code') code: string,
    @Query('thumbnail') thumbnail: string,
    @Query('format') format: string = 'webp',
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (code) {
      try {
        const decoded = await admin.auth().verifyIdToken(code);
        if (!decoded || !decoded.sub) {
          return res.status(401).send('Unauthorized');
        }
      } catch (error) {
        return res.status(401).send(`Invalid token: ${error.message}`);
      }
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
        'Cache-Control': 'public, max-age=31536000',
        ETag: id,
        'Last-Modified': new Date().toUTCString(),
      });

      const sharp = require('sharp');

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
}
