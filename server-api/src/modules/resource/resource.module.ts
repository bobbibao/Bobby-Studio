import { Module } from '@nestjs/common';
import { ResourceService } from './resource.service';
import { ResourceRepository } from './resource.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  providers: [ResourceService, ResourceRepository, PrismaService],
  exports: [ResourceService],
})
export class ResourceModule {}
