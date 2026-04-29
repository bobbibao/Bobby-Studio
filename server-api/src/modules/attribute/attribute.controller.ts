import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  Put,
  Patch,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AttributeService } from './attribute.service';
import { GCSUploadResult } from '../../connectors/gcs.connector';
import {
  ActionEntity,
  AttributeEntity,
  BasicImageUpscalingParams,
  BasicLineDrawingToImageParams,
  BasicImageToImageParams,
  BasicTextToImageParams,
  GeneratedImageAttributeEntity,
  GenerateImageParams,
  GenerateImageResponse,
  ProImageUpscalingParams,
  ProLineDrawingToImageParams,
  ProImageToImageParams,
  ProTextToImageParams,
  UploadImageResponse,
  GetImagesDTO,
  OriginalImageAttributeEntity,
} from './dto/common.dto';
import { __values } from 'tslib';
import { HistoryJobDto, UserAttributeEntity } from './dto/user-attribute.dto';
import { AttributeVersion, UserAttribute } from '@prisma/client';
import { BaseResponse, BobbyResponse } from '../../common';
import { randomUUID } from 'crypto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { VizpointService } from '../vizpoint/vizpoint.service';
import {
  ToggleFavoriteDto,
  isToggleFavoriteDto,
} from './dto/toggle-favorite.dto';
import { method } from 'lodash';
import {
  ActionMethodEnum,
  AttributeTypeEnum,
  CreationTypeEnum,
  InputTypeEnum,
} from 'src/constant/attribute-type.enum';
import { RedisService } from '../../shared/services/redis.service';
import { Public } from '../auth/public.decorator';
// import { EntitlementService } from './entitlement.service';
import { EntitlementService } from 'src/service/entitlement/entitlement.service';
import { UserService } from '../user/user.service';

@ApiTags('Attributes')
@Controller('attributes')
@UseGuards(AuthGuard)
export class AttributeController {
  private readonly logger = new Logger(AttributeController.name);

  constructor(
    private readonly attributeService: AttributeService,
    private readonly jwtService: JwtService,
    private readonly vizpointService: VizpointService,
    private readonly redisService: RedisService,
    private readonly entitlementService: EntitlementService,
    private readonly userService: UserService,
  ) {}

  @Post('upload-images/:userId')
  @UseInterceptors(FilesInterceptor('file')) // Ensure 'images' matches the field name in the request
  async uploadImages(
    @UploadedFiles() images: Express.Multer.File[],
    @Param('userId') userId: string,
  ): Promise<UploadImageResponse[]> {
    const results: GCSUploadResult[] = await this.attributeService.uploadImages(
      images,
      userId,
    );
    const attributes: AttributeEntity<
      OriginalImageAttributeEntity,
      ActionEntity
    >[] = results.map((r) => {
      const { Location, Key } = r;
      const image: OriginalImageAttributeEntity = {
        key: Key,
        path: Location,
      };
      const action: ActionEntity = {};
      const attr: AttributeEntity<OriginalImageAttributeEntity, ActionEntity> =
        {
          id: userId,
          attributeId: randomUUID(),
          version: randomUUID(),
          type: AttributeTypeEnum.ORIGINAL_IMAGE,
          value: image,
          actions: action,
        };
      return attr;
    });
    const userAttributes: UserAttribute[] =
      await this.attributeService.createAttributes(attributes);
    const uploadImageResponse: UploadImageResponse = {
      userId: userId,
      attributeId: userAttributes[0].attributeId,
      imagePath: results[0].Location,
    };
    return [uploadImageResponse];
  }

  @Get('unassigned/:userId')
  async getUnassignedAttributes(
    @Param('userId') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'desc',
    @Query('inputType') inputType?: InputTypeEnum | InputTypeEnum[],
    @Query('creationType') creationType?: CreationTypeEnum,
    @Query('lastCreatedAt') lastCreatedAt?: string,
    @Query('lastId') lastId?: string,
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }

    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const { data, total } = await this.attributeService.getUnassignedAttributes(
      userId,
      limit,
      offset,
      orderBy,
      handledInputType,
      creationType,
      lastCreatedAt ? new Date(lastCreatedAt) : undefined,
      lastId,
    );
    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });
    const result: BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    > = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Get('uploads/:userId')
  @ApiOperation({ summary: 'Get user uploaded images (Original_Image type)' })
  async getUserUploads(
    @Param('userId') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'desc',
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[]
    >
  > {
    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const { data, total } = await this.attributeService.getUserUploads(
      userId,
      limit,
      offset,
      orderBy,
    );
    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });
    const result: BobbyResponse<
      UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[]
    > = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Get('videos/:userId')
  @ApiOperation({ summary: 'Get user generated videos (Generated_Video type)' })
  async getUserVideos(
    @Param('userId') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'desc',
  ): Promise<BobbyResponse<any[]>> {
    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const { data, total } = await this.attributeService.getUserVideos(
      userId,
      limit,
      offset,
      orderBy,
    );
    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });
    const result: BobbyResponse<any[]> = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Post('assigned/:userId')
  async getAssignedAttributes(
    @Param('userId') userId: string,
    @Body() body: { imageIds: string[] },
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    if (body.imageIds && body.imageIds.length > 0) {
      const currentPage = page >= 1 ? page : 1;
      const offset = (currentPage - 1) * limit;
      const { data, total } = await this.attributeService.getAssignedAttributes(
        userId,
        body.imageIds,
        limit,
        offset,
      );

      const newData = data.map((a) => {
        if (typeof a.value === 'string') {
          a.value = JSON.parse(a.value);
        }
        if (typeof a.actions === 'string') {
          a.actions = JSON.parse(a.actions);
        }
        return a;
      });

      const result: BobbyResponse<
        UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        >[]
      > = {
        data: newData,
        total,
        page,
        limit,
      };
      return result;
    }

    const emptyResult: BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    > = {
      data: [],
      total: 0,
      page,
      limit,
    };
    return emptyResult;
  }

  parseFlexibleBoolean(value: any): boolean | undefined {
    if (value === true || value === 'true' || value === 1) return true;
    if (value === false || value === 'false' || value === 0) return false;
    return undefined; // or throw an error
  }

  @Get('images')
  async getImages(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('type') type?: ActionMethodEnum,
    @Query('inputType') inputType?: InputTypeEnum | InputTypeEnum[],
    @Query('creationType') creationType?: CreationTypeEnum,
    @Query('bookmark')
    isBookmark?: boolean,
    @Query('favorite') isFavorite?: boolean,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'asc',
    @Query('isPublished') isPublished?: boolean,
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const curUserId = req.currentUser.id;
    const userIsAdmin = req.currentUser.isAdmin ?? false;
    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const txt = type ? type.split(/[^a-zA-Z0-9]+/) : [];

    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }

    // Parse isPublished from query parameter (comes as string from URL)
    const parsedIsPublished = this.parseFlexibleBoolean(isPublished);

    const finalIsPublished = !userIsAdmin ? true : parsedIsPublished;

    const getImagesDTO: GetImagesDTO = {
      userId,
      offset,
      limit,
      type: txt.join(' ') as ActionMethodEnum,
      inputType: handledInputType,
      creationType,
      isBookmark: this.parseFlexibleBoolean(isBookmark),
      isFavorite: this.parseFlexibleBoolean(isFavorite),
      orderBy,
      isPublished: finalIsPublished,
    };
    const { data, total } = await this.attributeService.getImages(
      curUserId,
      getImagesDTO,
    );

    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });

    const result: BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    > = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Get('favorite-images')
  @UseGuards(AuthGuard)
  async getFavoriteImages(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('type') type?: ActionMethodEnum,
    @Query('bookmark') isBookmark?: boolean,
    @Query('favorite') isFavorite?: boolean,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'asc',
    @Query('creationType') creationType?: CreationTypeEnum,
    @Query('inputType') inputType?: InputTypeEnum | InputTypeEnum[],
    @Query('lastCreatedAt') lastCreatedAt?: string,
    @Query('lastId') lastId?: string,
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }

    const curUserId = req.currentUser.id;
    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const txt = type ? type.split(/[^a-zA-Z0-9]+/) : [];
    const getImagesDTO: GetImagesDTO = {
      userId: '9FVUE9kkasPcgCzkTUbhNIzZmSD2',
      offset,
      limit,
      type: txt.join(' ') as ActionMethodEnum,
      isBookmark: this.parseFlexibleBoolean(isBookmark),
      isFavorite: this.parseFlexibleBoolean(isFavorite),
      orderBy,
      inputType: handledInputType,
      creationType,
      lastCreatedAt: lastCreatedAt ? new Date(lastCreatedAt) : undefined,
      lastId,
    };
    const { data, total } = await this.attributeService.getFavoriteImages(
      curUserId,
      getImagesDTO,
    );
    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });
    const result: BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    > = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Get('bookmarked-images')
  @UseGuards(AuthGuard)
  async getBookmarkedImages(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('type') type?: ActionMethodEnum,
    @Query('bookmark') isBookmark?: boolean,
    @Query('favorite') isFavorite?: boolean,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'asc',
    @Query('creationType') creationType?: CreationTypeEnum,
    @Query('inputType') inputType?: InputTypeEnum | InputTypeEnum[],
    @Query('lastCreatedAt') lastCreatedAt?: string,
    @Query('lastId') lastId?: string,
  ): Promise<
    BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }

    const curUserId = req.currentUser.id;
    const currentPage = page >= 1 ? page : 1;
    const offset = (currentPage - 1) * limit;
    const txt = type ? type.split(/[^a-zA-Z0-9]+/) : [];
    const getImagesDTO: GetImagesDTO = {
      userId,
      offset,
      limit,
      inputType: handledInputType,
      creationType,
      type: txt.join(' ') as ActionMethodEnum,
      isBookmark: this.parseFlexibleBoolean(isBookmark),
      isFavorite: this.parseFlexibleBoolean(isFavorite),
      orderBy,
      lastCreatedAt: lastCreatedAt ? new Date(lastCreatedAt) : undefined,
      lastId,
    };
    const { data, total } = await this.attributeService.getBookmarkedImages(
      curUserId,
      getImagesDTO,
    );
    const newData = data.map((a) => {
      if (typeof a.value === 'string') {
        a.value = JSON.parse(a.value);
      }
      if (typeof a.actions === 'string') {
        a.actions = JSON.parse(a.actions);
      }
      return a;
    });
    const result: BobbyResponse<
      UserAttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    > = {
      data: newData,
      total,
      page,
      limit,
    };
    return result;
  }

  @Put('deactivate/:attributeId')
  @ApiOperation({ summary: 'Deactivate an attribute by ID' })
  @ApiResponse({
    status: 200,
    description: 'Attribute deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Attribute not found' })
  async deactivateAttribute(
    @Param('attributeId') attributeId: string,
  ): Promise<AttributeVersion | null> {
    return this.attributeService.deactivateAttribute(attributeId);
  }

  @Put()
  @ApiOperation({ summary: 'Update an attribute by ID' })
  @ApiResponse({ status: 200, description: 'Attribute updated successfully' })
  @ApiResponse({ status: 404, description: 'Attribute not found' })
  async updateAttribute(
    @Body()
    attributes: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[],
  ): Promise<
    BobbyResponse<
      AttributeEntity<
        OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
        ActionEntity
      >[]
    >
  > {
    const convertedAttributes: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[] = attributes.map((attr) => ({
      ...attr,
      id: attr.userId,
      attributeId: attr.attributeId,
      version: attr.version,
      type: attr.type as AttributeTypeEnum,
      value: attr.value,
      actions: attr.actions,
      createdAt: attr.createdAt,
      isPublished: attr.isPublished,
    }));
    const data =
      await this.attributeService.updateAttributes(convertedAttributes);
    return { data, total: data.length, page: 1, limit: data.length };
  }

  @Put('favorites/toggle')
  async updateFavoriteAttribute(
    @Body() attributes: ToggleFavoriteDto[],
    @Request() req,
  ): Promise<BaseResponse<null>> {
    attributes = attributes.filter((attr) => isToggleFavoriteDto(attr));
    if (attributes.length == 0) {
      return { data: null, success: false, message: 'No attributes provided' };
    }

    await Promise.all(
      attributes.map((attr) =>
        this.attributeService.toggleFavoriteStatus(
          req.currentUser.id,
          attr.attributeId,
          attr.version,
        ),
      ),
    );

    return {
      data: null,
      success: true,
      message: 'Favorites updated successfully',
    };
  }

  @Put('bookmark/toggle')
  async updateBookmarkAttribute(
    @Body() attributes: ToggleFavoriteDto[],
    @Request() req,
  ): Promise<BaseResponse<null>> {
    attributes = attributes.filter((attr) => isToggleFavoriteDto(attr));
    if (attributes.length == 0) {
      return { data: null, success: false, message: 'No attributes provided' };
    }

    await Promise.all(
      attributes.map((attr) =>
        this.attributeService.toggleBookmarkStatus(
          req.currentUser.id,
          attr.attributeId,
          attr.version,
        ),
      ),
    );

    return {
      data: null,
      success: true,
      message: 'Bookmarks updated successfully',
    };
  }

  @Patch('versions/publish')
  @ApiOperation({ summary: 'Update publish status of attribute versions' })
  @ApiResponse({
    status: 200,
    description: 'Attribute versions publish status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Version(s) not found' })
  async publishVersion(
    @Body('isPublished') isPublished: boolean,
    @Body('ids') ids?: string[],
  ) {
    // If no ids provided or empty array, return early
    if (!ids || ids.length === 0) {
      return [];
    }

    // Update publish status
    const result =
      ids.length === 1
        ? await this.attributeService.updatePublishStatus(ids[0], isPublished)
        : await this.attributeService.updateManyPublishStatus(ids, isPublished);

    await Promise.all([
      this.redisService.invalidatePattern('images:*:*:*:true'),
      this.redisService.invalidatePattern('images:*:*:*:all'),
    ]);

    return result;
  }
  @Patch('versions/publish-all')
  @ApiOperation({ summary: 'Update publish status of all attribute versions' })
  @ApiResponse({
    status: 200,
    description: 'All attribute versions publish status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to update attribute versions',
  })
  async publishAllVersions(@Body('isPublished') isPublished: boolean) {
    // Update all images' publish status
    const result = await this.attributeService.updateManyPublishStatus(
      null,
      isPublished,
    );

    // Invalidate inspiration cache after publishing/unpublishing all
    await Promise.all([
      this.redisService.invalidatePattern('images:*:*:*:true'),
      this.redisService.invalidatePattern('images:*:*:*:all'),
    ]);

    return result;
  }

  @Get('history/:userId')
  @Public()
  @ApiOperation({ summary: 'Get image generation history for a user' })
  @ApiResponse({
    status: 200,
    description: 'Image generation history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getHistoryJobs(
    @Param('userId') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('inputType') inputType?: InputTypeEnum[],
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'desc',
    @Query('creationType') creationType?: CreationTypeEnum,
    @Query('includeEditImages') includeEditImages?: string,
  ): Promise<{ data: HistoryJobDto[]; total: number }> {
    let handledInputType: InputTypeEnum[] = [];
    if (inputType) {
      handledInputType =
        typeof inputType === 'string' ? [inputType] : inputType;
    }

    // Parse includeEditImages param to determine history filter
    let historyFilter: 'all' | 'generated-only' | 'edited-only' = 'all';
    if (includeEditImages === 'false') {
      historyFilter = 'generated-only';
    } else if (
      includeEditImages === 'edited' ||
      includeEditImages === 'edited-only'
    ) {
      historyFilter = 'edited-only';
    }

    // Get user role to determine history window
    let minDate: Date | undefined;
    try {
      const user = await this.userService.getById(userId);
      const userRole = user?.role;
      const historyWindowMonths =
        this.entitlementService.getHistoryWindowMonths(userRole);

      // Calculate minimum date if there's a window restriction
      if (historyWindowMonths !== null) {
        const now = new Date();
        minDate = new Date(now);
        minDate.setMonth(now.getMonth() - historyWindowMonths);
      }
    } catch (error) {
      // If user not found or error, log but continue without date filter (fail open)
      this.logger.warn(
        `Error getting user role for history filtering: ${error.message}. Proceeding without date filter.`,
      );
    }

    return this.attributeService.getHistoryJobs(
      userId,
      limit,
      (page - 1) * limit,
      orderBy,
      handledInputType,
      creationType,
      historyFilter,
      minDate,
    );
  }

  @Get('edit-history/:userId')
  @Public()
  @ApiOperation({ summary: 'Get image edit history for a user' })
  @ApiResponse({
    status: 200,
    description: 'Image edit history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getEditImageHistory(
    @Param('userId') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('orderBy') orderBy: 'asc' | 'desc' = 'desc',
    @Query('imageId') imageId?: string,
  ): Promise<{ data: HistoryJobDto[]; total: number }> {
    return this.attributeService.getEditImageHistory(
      userId,
      limit,
      (page - 1) * limit,
      orderBy,
      imageId,
    );
  }

  @Get(':attributeId/actions')
  @ApiOperation({
    summary: 'Get actions for an attribute (use-template helper)',
  })
  async getAttributeActions(
    @Param('attributeId') attributeId: string,
    @Query('version') version?: string,
  ): Promise<ActionEntity | null> {
    const actions = await this.attributeService.getAttributeActions(
      attributeId,
      version,
    );
    return actions;
  }
}
