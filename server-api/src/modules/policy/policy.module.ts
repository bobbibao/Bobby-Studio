import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './policy.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  providers: [PolicyService, PolicyRepository, PrismaService],
  exports: [PolicyService],
})
export class PolicyModule {}
