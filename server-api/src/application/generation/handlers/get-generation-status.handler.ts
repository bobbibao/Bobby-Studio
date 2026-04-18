import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JobStatusResponseDto } from '../../../modules/image-generation/dto/image-response.dto';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { GetGenerationStatusQuery } from '../queries/get-generation-status.query';

@QueryHandler(GetGenerationStatusQuery)
export class GetGenerationStatusQueryHandler
  implements IQueryHandler<GetGenerationStatusQuery, JobStatusResponseDto>
{
  constructor(private readonly imageGenerationService: ImageGenerationService) {}

  execute(query: GetGenerationStatusQuery): Promise<JobStatusResponseDto> {
    return this.imageGenerationService.getJobStatus(query.jobId);
  }
}
