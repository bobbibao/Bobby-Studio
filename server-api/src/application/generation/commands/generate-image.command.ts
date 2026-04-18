import { ICommand } from '@nestjs/cqrs';
import { SdxlGenerateImageDto } from '../../../modules/image-generation/dto/sdxl-generation.dto';

export class GenerateImageCommand implements ICommand {
  constructor(
    public readonly dto: SdxlGenerateImageDto,
    public readonly userRole?: string,
  ) {}
}
