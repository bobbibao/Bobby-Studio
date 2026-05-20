import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Policy } from './types/policy.type';
// import { Resource } from '@prisma/client';
import { CreatePolicyDto } from './dto/create-policy.dto';

@Injectable()
export class PolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPolicy(createPolicyDto: CreatePolicyDto): Promise<Policy> {
    const { name, description, conditions } = createPolicyDto;
    return this.prisma.policy.create({
      data: {
        name,
        description,
        conditions,
        actionId: '',
      },
    });
  }

  // async assignPolicyToResource(policyId: string, resourceId: string): Promise<Resource> {
  //   return this.prisma.resource.update({
  //     where: { id: resourceId },
  //     data: {
  //       policies: {
  //         connect: { id: policyId },
  //       },
  //     },
  //     select: {
  //       id: true,
  //       type: true,
  //       path: true,
  //       ownerId: true,
  //       createdAt: true,
  //       updatedAt: true,
  //       policies: true, // Ensure policies are included in the returned object
  //     },
  //   });
  // }

  // async assignPolicyToUser(userId: string, policyId: string) {
  //   // Implement the logic to assign a policy to a user in the database
  //   return this.prisma.user.update({
  //     where: { id: userId },
  //     data: {
  //       policies: {
  //         connect: { id: policyId },
  //       },
  //     },
  //   });
  // }
}
