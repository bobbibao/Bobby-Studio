import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JobResultDto } from '../../../modules/image-generation/dto/image-response.dto';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { GetGenerationResultQuery } from '../queries/get-generation-result.query';

@QueryHandler(GetGenerationResultQuery)
export class GetGenerationResultQueryHandler
  implements IQueryHandler<GetGenerationResultQuery, JobResultDto>
{
  constructor(private readonly imageGenerationService: ImageGenerationService) {}

  execute(query: GetGenerationResultQuery): Promise<JobResultDto> {
    return this.imageGenerationService.getJobResult(query.jobId);
  }
}
