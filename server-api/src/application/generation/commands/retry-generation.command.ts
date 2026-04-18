import { ICommand } from '@nestjs/cqrs';

export class RetryGenerationCommand implements ICommand {
  constructor(
    public readonly jobId: string,
    public readonly userRole?: string,
  ) {}
}
