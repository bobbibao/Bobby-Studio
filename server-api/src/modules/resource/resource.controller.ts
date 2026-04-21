import { Controller, Post, UseGuards, Request, UploadedFile, UseInterceptors, Param, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacAbacGuard } from '../auth/rbac-abac.guard';
import { Permissions } from '../auth/permissions.decorator';
import { ResourceService } from './resource.service';
import * as multer from 'multer';
import { Multer } from 'multer'; // Add this import

@Controller('resources')
export class ResourceController {
  constructor(private resourceService: ResourceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: './uploads', // specify the destination directory
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // specify the file naming convention
      },
    }),
  }))
  async uploadImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.resourceService.uploadImage(req.user.userId, file);
  }

  @UseGuards(JwtAuthGuard, RbacAbacGuard)
  @Get(':resourceId')
  @Permissions('read:resource')
  async getResource(@Param('resourceId') resourceId: string) {
    return this.resourceService.getResource(resourceId);
  }
}
