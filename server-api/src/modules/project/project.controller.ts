import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
  Request,
  HttpException,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectsDto } from '../attribute/dto/create-project.dto';
import { AttributeService } from '../attribute/attribute.service';
import {
  ActionEntity,
  AttributeEntity,
  ProjectAttributeEntity,
  Project,
} from '../attribute/dto/common.dto';
import {
  AttributeTypeEnum,
  CreationTypeEnum,
  InputTypeEnum,
} from '../../constant/attribute-type.enum';
import {
  UserAttributeEntity,
  UserAttributesDto,
} from '../attribute/dto/user-attribute.dto';
import { AttributeVersion } from '@prisma/client';
import { UserAttributeService } from '../attribute/user-attribute.service';
import { AuthGuard } from '../auth/auth.guard';
import { OwnUserScopeGuard } from '../auth/own-user-scope.guard';
import { AuthenticatedRequest } from '../identity/principal';
// import { EntitlementService } from './entitlement.service';
import { EntitlementService } from 'src/service/entitlement/entitlement.service';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(
    private readonly attributeService: AttributeService,
    private readonly userAttributeService: UserAttributeService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Post()
  async upsertProjects(
    @Body() createProjectsDto: CreateProjectsDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserAttributesDto[]> {
    // Projects always belong to the authenticated caller; a userId in the body is ignored.
    const userId = req.currentUser.id;
    const { projects } = createProjectsDto;

    // Updating an existing project requires owning it; foreign ids look like missing resources.
    const referencedIds = projects
      .map((p: Project & { attributeId?: string }) => p.attributeId ?? p.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (!(await this.attributeService.ownsOrIsUnused(userId, referencedIds))) {
      throw new NotFoundException('Project not found');
    }

    // Get user role from request (set by AuthGuard)
    const userRole = req.currentUser?.role;

    // Count existing projects for the user
    const currentProjectCount = await this.attributeService.countUserProjects(
      userId,
    );

    const newProjectsCount = projects.filter(
      (p: Project & { attributeId?: string; value?: ProjectAttributeEntity }) =>
        !(p.id || p.attributeId),
    ).length; // Count only new projects (without id/attributeId)

    if (newProjectsCount > 0) {
      // Check if user can create at least one new project
      if (
        !this.entitlementService.canCreateProject(
          userRole,
          currentProjectCount,
        )
      ) {
        throw new ForbiddenException(
          this.entitlementService.getProjectLimitErrorMessage(userRole),
        );
      }
    }

    const attributes: AttributeEntity<ProjectAttributeEntity, ActionEntity>[] =
      projects.map((p: Project & { attributeId?: string; value?: ProjectAttributeEntity }) => {
        const type = AttributeTypeEnum.PROJECT;
        const action: ActionEntity = {};
        const attr: AttributeEntity<ProjectAttributeEntity, ActionEntity> = {
          id: userId,
          attributeId: p.attributeId ?? p.id, // prefer existing attributeId, fallback to id
          type,
          value: (p.value as ProjectAttributeEntity) ?? (p as ProjectAttributeEntity),
          actions: action,
        };
        return attr;
      });
    const data: AttributeVersion[] =
      await this.attributeService.upsertAttributes(userId, attributes);
    const userAttributes: UserAttributesDto[] = data.map((a) => {
      const userAttribute: UserAttributesDto = {
        userId,
        attributeId: a.id,
      };
      return userAttribute;
    });

    return await this.userAttributeService.assignAttributesToUser(
      userAttributes,
    );
  }

  @Get('user/:userId')
  @UseGuards(OwnUserScopeGuard)
  async getProjects(
    @Param('userId') userId: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
    @Query('inputType') inputType?: InputTypeEnum[],
    @Query('creationType') creationType?: CreationTypeEnum,
  ): Promise<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> {
    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }
    return this.attributeService.getUserProjects(
      userId,
      orderBy,
      handledInputType,
      creationType,
    );
  }
}
