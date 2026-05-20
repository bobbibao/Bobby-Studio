import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { AttributeService } from '../attribute/attribute.service';
import { ConfigurationDto } from '../attribute/dto/configuration.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('configurations')
export class ConfigurationController {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly attributeService: AttributeService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  async createConfiguration(@Body() body: { userId: string; configuration: ConfigurationDto }) {
    const { userId, configuration } = body;
    // return { userId, configuration }
    return this.configurationService.createConfiguration(userId, configuration);
  }

  @Put()
  async updateConfiguration(@Body() body: { userId: string; key: string; value: string }) {
    return this.configurationService.updateConfiguration(body.userId, body.key, body.value);
  }

  @Delete(':userId/:key')
  async deleteConfiguration(@Param('userId') userId: string, @Param('key') key: string) {
    return this.configurationService.deleteConfiguration(userId);
  }

  // implement get configurations by user id
  @Get('user/:userId')
  async getConfigurationsByUserId(
    @Request() req: any,
    @Param('userId') userId: string,
  ): Promise<ConfigurationDto> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];

    const json: any = this.jwtService.decode(token, { json: true });
    const currentEmail = json.email;
    const defaultAdmin = [
      // 'bobby.dev@gmail.com',
      'info@bobby.ai',
    ];
    let isAdmin = false;
    if (defaultAdmin.includes(currentEmail)) {
      isAdmin = true;
    }
    return this.configurationService.getUserConfigurations(userId, isAdmin);
  }
}
