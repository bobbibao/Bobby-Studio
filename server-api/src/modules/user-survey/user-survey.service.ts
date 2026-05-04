import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserSurveyDto } from './dto/create-user-survey.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class UserSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService
  ) {}

  async hasCompletedSurvey(userId: string): Promise<boolean> {
    const user = await this.userService.getById(userId);
    return user?.surveyCompletedAt !== null;
  }

  async createSurvey(userId: string, createUserSurveyDto: CreateUserSurveyDto) {
    const { survey } = createUserSurveyDto;

    const finalSurvey = survey && Object.keys(survey).length > 0 ? survey : {};

    const existingSurvey = await this.prisma.userSurvey.findUnique({
      where: { userId },
    });

    if (existingSurvey) {
      return this.prisma.userSurvey.update({
        where: { userId },
        data: { survey: finalSurvey },
      });
    }

    return this.prisma.userSurvey.create({
      data: {
        userId,
        survey: finalSurvey,
      },
    });
  }

  async clearSurvey(userId: string) {
    await this.prisma.userSurvey.deleteMany({
      where: { userId },
    });
  }
}
