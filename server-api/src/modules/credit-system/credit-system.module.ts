import { CreditSystemService } from './credit-system.service';
import { Module } from '@nestjs/common';
@Module({
  providers: [CreditSystemService],
  exports: [CreditSystemService],
})
export class CreditSystemModule {}
