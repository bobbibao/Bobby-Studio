import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/** One PrismaClient (one connection pool) for the whole process. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
