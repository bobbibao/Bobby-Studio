import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  BadRequestException,
  Body,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import UploadService from './upload.service';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from '../user/user.service';
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService, private readonly userService: UserService,) {}

  @Post('image')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req,
  ) {
    
    const userId = req?.currentUser?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    if (file) {
      // Use the correct GCS folder for user profile images
      const imgUrl = `images/users/${userId}/profile`
      const imageUrl = await this.uploadService.uploadFileToGCS(file, `images/users/${userId}/profile`);
      
      // await this.userService.addImgPersonalInformation(userId,imageUrl);
      return {
        message: 'File uploaded successfully',
        imgUrl: imageUrl,
      };
        
    }
    else if (body && body.file && typeof body.file === 'string' && body.file.startsWith('data:')) {
      try {
        const base64Data = body.file;

        if (!base64Data.includes('base64,')) {
          throw new BadRequestException('Invalid base64 format');
        }

        const [header, data] = base64Data.split('base64,');

        const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';

        const extension = this.getExtensionFromMimeType(mimeType);
        const fileName = `image-${Date.now()}.${extension}`;

        const buffer = Buffer.from(data, 'base64');

        // Use the correct GCS folder for user profile images
        const imageUrl = await this.uploadService.uploadBase64ToGCS(buffer, fileName, mimeType, `images/users/${userId}/profile`);
        
        
        return {
          message: 'Base64 image uploaded successfully',
          imgUrl: imageUrl,
        };
      } catch (error) {
        throw new BadRequestException('Failed to process base64 image: ' + error.message);
      }
    } else {
      throw new BadRequestException('No file or base64 image provided');
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/tiff': 'tiff',
      'application/pdf': 'pdf'
    };

    return mimeToExt[mimeType] || 'jpg';
  }
}
