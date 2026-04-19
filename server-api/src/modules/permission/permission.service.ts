import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      // include: { permissions: true },
    });
  }

  async addPermissionToUser(userId: string, permissionId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        // permissions: {
        //   connect: { id: permissionId },
        // },
      },
    });
  }
}
