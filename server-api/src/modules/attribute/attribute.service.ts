import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { AttributeRepository } from './attribute.repository';
import { HistoryJobDto, UserAttributeEntity } from './dto/user-attribute.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  GCSConnector,
  GCSUploadResult,
  ImageFolderType,
  GCSUploadOptions,
} from '../../connectors/gcs.connector';

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
  OriginalImageAttributeEntity,
  ProImageUpscalingParams,
  ProjectAttributeEntity,
  ProLineDrawingToImageParams,
  ProImageToImageParams,
  ProTextToImageParams,
  ValueAttributeEntity,
  GetImagesParams,
  GetImagesDTO,
  PaintingActionEntity,
  HistoryImageFilter,
} from './dto/common.dto';
import {
  Attribute,
  AttributeVersion,
  PrismaClient,
  UserAttribute,
} from '@prisma/client';
import axios from 'axios';
import { ConfigurationDto } from './dto/configuration.dto';
import { randomUUID } from 'crypto';
import {
  ActionMethodEnum,
  InspirationMethodEnum,
  InspirationMethodURL,
  InputTypeEnum,
  CreationTypeEnum,
} from '../../constant/attribute-type.enum';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { FavoriteRepository } from '../favorite/favorite.repository';
import { UserService } from '../user/user.service';
import { ActionEntityEdit } from './dto/edit-images.dto';

@Injectable()
export class AttributeService {
  private readonly logger = new Logger(AttributeService.name);

  constructor(
    private readonly attributeRepository: AttributeRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly favoriteRepository: FavoriteRepository,
    private readonly gcsConnector: GCSConnector,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async createAttributes(
    attributes: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity | PaintingActionEntity | ActionEntityEdit
    >[],
  ): Promise<UserAttribute[]> {
    return this.attributeRepository.createUserAttribute(attributes);
  }

  async uploadImages(
    files: Express.Multer.File[],
    userId?: string,
  ): Promise<GCSUploadResult[]> {
    try {
      const uploadOptions: GCSUploadOptions = {
        folderType: ImageFolderType.USER_GENERATED,
        userId: userId,
        resizeImage: true,
        resizeOptions: {
          quality: 90,
          maintainAspectRatio: true,
        },
      };

      const uploadPromises = files.map((file) => {
        return this.gcsConnector.uploadFile(file, uploadOptions);
      });

      const results = await Promise.allSettled(uploadPromises).then(
        (results) => {
          const successful = results
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value);

          const failed = results.filter(
            (result) => result.status === 'rejected',
          );
          if (failed.length > 0) {
            this.logger.warn(
              `${failed.length} out of ${files.length} files failed to upload`,
            );
          }

          return successful;
        },
      );

      this.logger.log(
        `Successfully uploaded ${results.length} images for user ${userId}`,
      );
      return results;
    } catch (error) {
      this.logger.error(`Error uploading images: ${error.message}`);
      throw new Error('Image upload failed');
    }
  }

  // private async downloadImageFromS3(imagePath) {
  //   try {
  //     const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
  //     const base64 = Buffer.from(response.data, 'binary').toString('base64');
  //     return base64;
  //   } catch (error) {
  //     console.error('Error download image from S3:', error);
  //     throw new Error('Image download from S3 failed');
  //   }
  // }

  async upsertAttributes(
    userId: string,
    attributes: AttributeEntity<ValueAttributeEntity, ActionEntity>[],
  ): Promise<AttributeVersion[]> {
    const response: AttributeVersion[] =
      await this.attributeRepository.bulkUpsertAttributes(userId, attributes);
    return response;
  }

  async getUnassignedAttributes(
    userId: string,
    limit: number,
    offset: number,
    orderBy: 'asc' | 'desc' = 'desc',
    inputType?: InputTypeEnum[],
    creationType?: CreationTypeEnum,
    lastCreatedAt?: Date,
    lastId?: string,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    return this.attributeRepository.getUnassignedAttributes(
      userId,
      limit,
      offset,
      orderBy,
      inputType,
      creationType,
    );
  }

  async getUserUploads(
    userId: string,
    limit: number,
    offset: number,
    orderBy: 'asc' | 'desc' = 'desc',
  ): Promise<{
    data: UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[];
    total: number;
  }> {
    return this.attributeRepository.getUserUploads(
      userId,
      limit,
      offset,
      orderBy,
    );
  }

  async getUserVideos(
    userId: string,
    limit: number,
    offset: number,
    orderBy: 'asc' | 'desc' = 'desc',
  ): Promise<{
    data: any[];
    total: number;
  }> {
    return this.attributeRepository.getUserVideos(
      userId,
      limit,
      offset,
      orderBy,
    );
  }

  async getAssignedAttributes(
    userId: string,
    imageIds: string[],
    limit?: number,
    offset?: number,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const limitDefault: number = limit ? limit : 10;
    const offsetDefault: number = offset ? offset : 0;
    return this.attributeRepository.getUserImages(
      userId,
      imageIds,
      limitDefault,
      offsetDefault,
    );
  }

  async getImages(
    curUserId: string,
    getImagesDTO: GetImagesDTO,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const {
      limit,
      type,
      offset,
      userId,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      creationType,
      inputType,
    } = getImagesDTO;
    const limitDefault: number = limit ? limit : 10;
    const offsetDefault: number = offset ? offset : 0;
    // let methods: InspirationMethodEnum[] = [];
    // if (models && models.length > 0) {
    //   // Handle multiple models by mapping each ActionMethodEnum to its corresponding InspirationMethodEnum values
    //   methods = models.flatMap((model) => {
    //     switch (model) {
    //       case ActionMethodEnum.TEXT_TO_IMAGE:
    //         return [
    //           InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
    //           InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
    //         ];
    //       case ActionMethodEnum.LINE_DRAWING_TO_IMAGE:
    //         return [
    //           InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    //           InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    //         ];
    //       case ActionMethodEnum.IMAGE_UPSCALING:
    //         return [
    //           InspirationMethodEnum.BASIC_IMAGE_UPSCALING,
    //           InspirationMethodEnum.PRO_IMAGE_UPSCALING,
    //         ];
    //       case ActionMethodEnum.IMAGE_TO_IMAGE:
    //         return [
    //           InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
    //           InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    //         ];
    //       default:
    //         return [];
    //     }
    //   });
    // } else {
    //   switch (type) {
    //     case ActionMethodEnum.TEXT_TO_IMAGE:
    //       methods = [
    //         InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
    //         InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
    //       ];
    //       break;
    //     case ActionMethodEnum.LINE_DRAWING_TO_IMAGE:
    //       methods = [
    //         InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    //         InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    //       ];
    //       break;
    //     case ActionMethodEnum.IMAGE_UPSCALING:
    //       methods = [
    //         InspirationMethodEnum.BASIC_IMAGE_UPSCALING,
    //         InspirationMethodEnum.PRO_IMAGE_UPSCALING,
    //       ];
    //       break;
    //     case ActionMethodEnum.IMAGE_TO_IMAGE:
    //       methods = [
    //         InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
    //         InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    //       ];
    //       break;
    //     default:
    //       methods = [
    //         InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
    //         InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
    //         InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    //         InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    //         InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
    //         InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    //       ];
    //       break;
    //   }
    // }
    const params: GetImagesParams = {
      limit: limitDefault,
      offset: offsetDefault,
      userId,
      inputType,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      creationType,
    };
    return this.attributeRepository.getImages(curUserId, params);
  }

  async getFavoriteImages(
    userId: string,
    getImagesDTO: GetImagesDTO,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const {
      limit,
      type,
      offset,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      inputType,
      creationType,
      lastCreatedAt,
      lastId,
    } = getImagesDTO;
    const limitDefault: number = limit ? limit : 10;
    const offsetDefault: number = offset ? offset : 0;
    // let methods: InspirationMethodEnum[] = [];
    // switch (type) {
    //   case ActionMethodEnum.TEXT_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
    //       InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
    //     ];
    //     break;
    //   case ActionMethodEnum.LINE_DRAWING_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    //       InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    //     ];
    //     break;
    //   case ActionMethodEnum.IMAGE_UPSCALING:
    //     methods = [
    //       InspirationMethodEnum.BASIC_IMAGE_UPSCALING,
    //       InspirationMethodEnum.PRO_IMAGE_UPSCALING,
    //     ];
    //     break;
    //   case ActionMethodEnum.IMAGE_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
    //       InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    //     ];
    //     break;
    //   default:
    //     methods = [];
    //     break;
    // }
    const params: GetImagesParams = {
      limit: limitDefault,
      offset: offsetDefault,
      userId,
      inputType,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      creationType,
      lastCreatedAt,
      lastId,
    };
    return this.attributeRepository.getFavoriteImages(userId, params);
  }

  async getHistoryJobs(
    userId: string,
    limit?: number,
    offset?: number,
    orderBy: 'asc' | 'desc' = 'desc',
    inputType?: InputTypeEnum[],
    creationType?: CreationTypeEnum,
    includeEditImages?: HistoryImageFilter,
    minDate?: Date,
  ): Promise<{
    data: HistoryJobDto[];
    total: number;
  }> {
    return this.attributeRepository.getHistoryJobs({
      userId,
      limit,
      offset,
      orderBy,
      inputType,
      creationType,
      includeEditImages,
      minDate,
    });
  }

  async getEditImageHistory(
    userId: string,
    limit?: number,
    offset?: number,
    orderBy: 'asc' | 'desc' = 'desc',
    imageId?: string,
  ): Promise<{
    data: HistoryJobDto[];
    total: number;
  }> {
    return this.attributeRepository.getEditImageHistory({
      userId,
      limit,
      offset,
      orderBy,
      imageId,
    });
  }

  /**
   * Get the batchEditId for a given image to maintain edit chain
   */
  async getBatchEditIdForImage(
    userId: string,
    imageId: string,
  ): Promise<string | null> {
    return this.attributeRepository.getBatchEditIdForImage(userId, imageId);
  }

  /**
   * Update the batchEditId for a given image to start/continue an edit chain
   */
  async updateBatchEditIdForImage(
    userId: string,
    imageId: string,
    batchEditId: string,
  ): Promise<boolean> {
    return this.attributeRepository.updateBatchEditIdForImage(
      userId,
      imageId,
      batchEditId,
    );
  }

  async getBookmarkedImages(
    userId: string,
    getImagesDTO: GetImagesDTO,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const {
      limit,
      type,
      offset,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      inputType,
      creationType,
      lastCreatedAt,
      lastId,
    } = getImagesDTO;
    const limitDefault: number = limit ? limit : 10;
    const offsetDefault: number = offset ? offset : 0;
    // let methods: InspirationMethodEnum[] = [];
    // switch (type) {
    //   case ActionMethodEnum.TEXT_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
    //       InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
    //     ];
    //     break;
    //   case ActionMethodEnum.LINE_DRAWING_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    //       InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    //     ];
    //     break;
    //   case ActionMethodEnum.IMAGE_UPSCALING:
    //     methods = [
    //       InspirationMethodEnum.BASIC_IMAGE_UPSCALING,
    //       InspirationMethodEnum.PRO_IMAGE_UPSCALING,
    //     ];
    //     break;
    //   case ActionMethodEnum.IMAGE_TO_IMAGE:
    //     methods = [
    //       InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
    //       InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    //     ];
    //     break;
    //   default:
    //     methods = [];
    //     break;
    // }
    const params: GetImagesParams = {
      limit: limitDefault,
      offset: offsetDefault,
      userId,
      inputType,
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      creationType,
      lastCreatedAt,
      lastId,
    };
    return this.attributeRepository.getBookmarkedImages(userId, params);
  }

  async getUserProjects(
    userId: string,
    orderBy: 'asc' | 'desc' = 'desc',
    inputType?: InputTypeEnum[],
    creationType?: CreationTypeEnum,
  ): Promise<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> {
    return this.attributeRepository.getUserProjects({
      userId,
      orderBy,
      inputType,
      creationType,
    });
  }

  /**
   * Count user projects efficiently
   * @param userId - User ID to count projects for
   * @returns Number of projects the user has
   */
  async countUserProjects(userId: string): Promise<number> {
    return this.attributeRepository.countUserProjects(userId);
  }

  async getUserImages(
    userId: string,
    imageIds: string[],
    limit?: number,
    offset?: number,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const limitDefault: number = limit ? limit : 10;
    const offsetDefault: number = offset ? offset : 0;
    return this.attributeRepository.getUserImages(
      userId,
      imageIds,
      limitDefault,
      offsetDefault,
    );
  }

  async getUserConfigurations(
    userId: string,
  ): Promise<UserAttributeEntity<ConfigurationDto, ActionEntity>> {
    return this.attributeRepository.getUserConfigurations(userId);
  }

  async createAttribute(
    attribute: AttributeEntity<GeneratedImageAttributeEntity, ActionEntity>,
  ): Promise<Attribute> {
    return this.prisma.attribute.create({
      data: {
        id: attribute.id,
        version: attribute.version,
        previousVersion: randomUUID(),
        type: attribute.type,
        value: attribute.value
          ? JSON.parse(JSON.stringify(attribute.value))
          : null,
        actions: JSON.parse(JSON.stringify(attribute.actions)),
      },
    });
  }

  async createAttributeVersion(
    id: string,
    version: string,
  ): Promise<AttributeVersion> {
    return this.attributeRepository.createAttributeVersion(id, version);
  }

  async updateAttributes(
    updateAttributeDtos: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[],
  ): Promise<
    AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[]
  > {
    return this.attributeRepository.updateAttributes(updateAttributeDtos);
  }

  async deactivateAttribute(
    attributeId: string,
  ): Promise<AttributeVersion | null> {
    return this.attributeRepository.deactivateAttribute(attributeId);
  }

  async updatePublishStatus(id: string, isPublished: boolean) {
    return this.attributeRepository.updatePublishStatus(id, isPublished);
  }

  async updateManyPublishStatus(ids: string[] | null, isPublished: boolean) {
    return this.attributeRepository.updateManyPublishStatus(ids, isPublished);
  }

  // todo: have to  it to favorite module later
  async toggleFavoriteStatus(
    userId: string,
    attributeId: string,
    version: string,
  ): Promise<boolean> {
    const existing = await this.favoriteRepository.findFavorite(
      userId,
      attributeId,
      version,
    );

    if (existing) {
      // If already favorited, remove
      await this.favoriteRepository.removeFavorite(
        userId,
        attributeId,
        version,
      );
      return false; // Removed from favorites
    } else {
      // If not favorited, add
      await this.favoriteRepository.addFavorite(userId, attributeId, version);
      return true; // Added to favorites
    }
  }

  async getUserFavorites(userId: string) {
    return this.favoriteRepository.getFavoritesByUser(userId);
  }

  // todo: have to move it to bookmark module later
  async toggleBookmarkStatus(
    userId: string,
    attributeId: string,
    version: string,
  ): Promise<boolean> {
    const existing = await this.bookmarkRepository.findBookmark(
      userId,
      attributeId,
      version,
    );

    if (existing) {
      // If already bookmarked, remove
      await this.bookmarkRepository.removeBookmark(
        userId,
        attributeId,
        version,
      );
      return false; // Removed from bookmarks
    } else {
      // If not bookmarked, add
      await this.bookmarkRepository.addBookmark(userId, attributeId, version);
      return true; // Added to bookmarks
    }
  }

  async getUserBookmarks(userId: string) {
    return this.bookmarkRepository.getBookmarksByUser(userId);
  }

  // New: fetch actions for a given attribute id/version
  async getAttributeActions(
    attributeId: string,
    version?: string,
  ): Promise<ActionEntity | null> {
    return this.attributeRepository.getAttributeActions(attributeId, version);
  }

  async getUserImageHistory(
    userId: string,
    query: any,
  ): Promise<{ data: any[]; total: number }> {
    const { page = 1, limit = 10, inputType,
      method,
      resolution,
      aspectRatio,
      selectedEditingModels, sort = 'desc' } = query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const filters = {
      inputType,
      method,
      resolution,
      aspectRatio,
      selectedEditingModels,
    };
    const result = await this.attributeRepository.getUserImageHistory(
      userId,
      pageNum,
      limitNum,
      filters,
      sort,
    );
    
    // --- IGNORE ---
    const data = result.data.map((item) => {
      const actions = item.actions as any;
      const isEdit = item.batchEditId !== null;
      const params = isEdit ? actions.editImageParams?.data : actions.generateImageParams?.data;
      const jobId = item.jobId;
      const batchEditId = item.batchEditId;
      
      const modelName = isEdit ? params?.selectedEditingModels : item?.modelName;
      const resolution = isEdit ?  params?.resolution : params?.imageSize;
      const aspectRatio = params?.aspectRatio;
      const selectedEditingModels = isEdit ? params?.selectedEditingModels : params?.selectedModels;
      
      const method = actions.method;
      return {
        id: item.id,
        userId,
        inputType: isEdit ? 'edit' : 'generate',
        method,
        modelName,
        resolution,
        aspectRatio,
        selectedEditingModels,
        jobId,
        batchEditId,
        createdAt: item.createdAt,
      };
    });
    return { data, total: result.total };
  }
  async getAttributeById(attributeId: string): Promise<Attribute | null> {
    return this.attributeRepository.getAttributeById(attributeId);
  }
  async getAttributeDetailById(attributeId: string): Promise<any| null> {
    return this.attributeRepository.getUserImageHistoryDetail(attributeId);
  }
}
