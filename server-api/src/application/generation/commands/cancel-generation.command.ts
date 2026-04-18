import { ICommand } from '@nestjs/cqrs';

export class CancelGenerationCommand implements ICommand {
  constructor(public readonly jobId: string) {}
}
