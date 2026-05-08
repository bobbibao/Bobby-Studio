import { CreditSystemService } from './credit-system.service';
import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
@Module({
  providers: [CreditSystemService, PrismaService],
  exports: [CreditSystemService],
})
export class CreditSystemModule {}
