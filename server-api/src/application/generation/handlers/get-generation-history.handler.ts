import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { JobStatusResponseDto } from '../../../modules/image-generation/dto/image-response.dto';
import { ImageGenerationService } from '../../../modules/image-generation/image-generation.service';
import { GetGenerationHistoryQuery } from '../queries/get-generation-history.query';

@QueryHandler(GetGenerationHistoryQuery)
export class GetGenerationHistoryQueryHandler
  implements IQueryHandler<GetGenerationHistoryQuery, JobStatusResponseDto[]>
{
  constructor(private readonly imageGenerationService: ImageGenerationService) {}

  execute(query: GetGenerationHistoryQuery): Promise<JobStatusResponseDto[]> {
    return this.imageGenerationService.getUserJobs(
      query.userId,
      query.limit,
      query.inputType,
      query.type,
    );
  }
}
