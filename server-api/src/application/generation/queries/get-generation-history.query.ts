import { IQuery } from '@nestjs/cqrs';
import { InputTypeEnum } from '../../../constant/attribute-type.enum';

export class GetGenerationHistoryQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly limit: number,
    public readonly inputType?: InputTypeEnum[],
    public readonly type?: string,
  ) {}
}
