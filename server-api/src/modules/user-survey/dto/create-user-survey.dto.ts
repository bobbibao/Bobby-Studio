// dto/create-user-survey.dto.ts
import { IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateUserSurveyDto {
  @IsObject()
  survey: Record<string, any>;
}
