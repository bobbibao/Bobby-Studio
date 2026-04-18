import { IQuery } from '@nestjs/cqrs';

export class GetGenerationResultQuery implements IQuery {
  constructor(public readonly jobId: string) {}
}
