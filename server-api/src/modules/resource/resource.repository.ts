import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';


@Injectable()
export class ResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // async findResourceWithPolicies(resourceId: string): Promise<ResourceWithPolicies | null> {
  //   return this.prisma.resource.findUnique({
  //     where: { id: resourceId },
  //     include: { policies: true },
  //   });
  // }

  // async create(data: any) {
  //   // Implement the logic to create a resource in the database
  //   return this.prisma.resource.create({ data });
  // }

  // async findConfigurationsByRoles(roleNames: string[]): Promise<Configuration[]> {
  //   // Query configurations based on roles
  //   return this.prisma.configuration.findMany({
  //     where: {
  //       roles: {
  //         some: {
  //           name: {
  //             in: roleNames,
  //           },
  //         },
  //       },
  //     },
  //   });
  // }
}
