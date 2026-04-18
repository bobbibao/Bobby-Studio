import { IQuery } from '@nestjs/cqrs';

export class GetGenerationStatusQuery implements IQuery {
  constructor(public readonly jobId: string) {}
}
