import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigurationDto, InspirationConfigurationDto } from '../attribute/dto/configuration.dto';

@Injectable()
export class ConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}


  async findConfigurationsByUserId(userId: string): Promise<ConfigurationDto> {
    // const { value } = await this.prisma.userConfigurations.findFirst({
    //   where: {
    //     userId: userId,
    //   },
    // });
    const value = await this.prisma.$queryRaw`select 
          ua."userId", 
          ua."attributeId", 
          a."version", 
          a.value, 
          a.actions,
          a."createdAt"
      from "UserAttribute" ua 
      inner join "AttributeVersion" av on
          ua."attributeId" = av.id
      inner join "Attribute" a on 
          av.id = a.id and
          av."version" = a."version"
      where 
          a."type" = 'Configurations'
          and ua."userId" = ${userId}`
    if (typeof value === 'string') {
      const parsedValue = JSON.parse(value) as ConfigurationDto;
      return parsedValue;
    }
    return null;
  }
}
