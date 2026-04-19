import { ApiProperty } from '@nestjs/swagger';

export class TeamDto {
  id: string;

  name: string;

  createdAt: Date;

  updatedAt: Date;

  ownerId: string;
}

export class MemberDto {
  id: string;

  email: string;

  role: string;

  createdAt: Date;
}

export class GetTeamMembersResponseDto {
  @ApiProperty({ type: TeamDto })
  team: TeamDto;

  @ApiProperty({ type: [MemberDto] })
  members: MemberDto[];
}
