import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserSurveyService } from './user-survey.service';
import { CreateUserSurveyDto } from './dto/create-user-survey.dto';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from '../user/user.service';

@Controller('user-surveys')
export class UserSurveyController {
  constructor(
    private readonly userSurveyService: UserSurveyService,
    private readonly userService: UserService
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async createSurvey(
    @Body() createUserSurveyDto: CreateUserSurveyDto,
    @Request() req
  ) {
    const userId = req.currentUser.id;
    await this.userSurveyService.createSurvey(userId, createUserSurveyDto);
    await this.userService.markCompletedSurvey(userId, true);
    return true;
  }

  @Post('clear')
  @UseGuards(AuthGuard)
  async clearSurvey(@Request() req) {
    const userId = req.currentUser.id;
    await this.userSurveyService.clearSurvey(userId);
    await this.userService.markCompletedSurvey(userId, false);
    return { message: 'Survey cleared successfully' };
  }
}
