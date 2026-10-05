import { Module } from '@nestjs/common';
import { CreditLedgerService } from './credit-ledger.service';
import { CreditsController } from './credits.controller';

@Module({
  controllers: [CreditsController],
  providers: [CreditLedgerService],
  exports: [CreditLedgerService],
})
export class CreditsModule {}
