import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { MemberRole } from '../../../config/roles.config';

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(MemberRole)
  role: MemberRole = MemberRole.MEMBER;
}
