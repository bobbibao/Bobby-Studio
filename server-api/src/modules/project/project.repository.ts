import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProjectsDto } from '../attribute/dto/create-project.dto';

@Injectable()
export class ProjectRepository {
    constructor(private readonly prisma: PrismaService) {}

    // async createProjects(data: CreateProjectsDto): Promise<string> {
    //     const [type, version] = ['project', ''];
    //     const { id } = await this.prisma.attribute.create({
    //         data: {
    //             type,
    //             value: JSON.stringify(data),
    //             actions: JSON.stringify({}),
    //             version,
    //         },
    //         select: {
    //         id: true,
    //         },
    //     });
    //     return id;
    // }

    async getUserProjects(userId: string) {
        return this.prisma.userAttribute.findMany({
            where: {
            userId: userId,
            },
        });
    }
} 
