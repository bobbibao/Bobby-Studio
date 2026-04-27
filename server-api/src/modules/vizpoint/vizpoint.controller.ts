import { Controller, UseGuards, Get, Param, Request } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { VizpointService } from './vizpoint.service';
import { VizPointsDto } from './dtos/VizPoints.dto';

@Controller('vizpoint')
@UseGuards(AuthGuard)
export class VizpointController {
  constructor(private readonly vizPointsService: VizpointService) {}

  @Get('/')
  async getVizPoints(@Request() req): Promise<VizPointsDto> {
    const userId = req.currentUser.id;
    const points = await this.vizPointsService.getUserVizPoints(userId);
    return points;
  }
}
