import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ResourceManagementService } from './resource-management.service';
import { GenerateResourceParamsDto } from './dto/generate-params.dto';

@Controller('resource-management')
export class ResourceManagementController {
  constructor(private readonly resourceManagementService: ResourceManagementService) {}

  // @Post('generate-resource')
  // async generateResource(@Body() generateResourceParamsDto: GenerateResourceParamsDto) {
  //   return this.resourceManagementService.generateResource(generateResourceParamsDto);
  // }

  // @Get('user-resources/:userId')
  // async getResourcesForUser(@Param('userId') userId: string) {
  //   return this.resourceManagementService.getResourcesForUser(userId);
  // }
}
