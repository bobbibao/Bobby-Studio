import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './policy.repository';

@Module({
  providers: [PolicyService, PolicyRepository],
  exports: [PolicyService],
})
export class PolicyModule {}
