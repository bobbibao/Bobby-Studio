import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreditBalance } from '../../application/generation/contracts';
import { AuthenticatedRequest } from '../identity/principal';
import { CreditLedgerService } from './credit-ledger.service';

@ApiTags('Credits')
@Controller('credits')
export class CreditsController {
  constructor(private readonly ledger: CreditLedgerService) {}

  @Get('balance')
  balance(@Request() req: AuthenticatedRequest): Promise<CreditBalance> {
    return this.ledger.getBalance(req.currentUser.id);
  }
}
