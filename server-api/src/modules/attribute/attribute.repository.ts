import {
  AttributeVersion,
  Prisma,
  PrismaClient,
  UserAttribute,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HistoryJobDto, UserAttributeEntity } from './dto/user-attribute.dto';
import {
  ActionEntity,
  AttributeEntity,
  GeneratedImageAttributeEntity,
  GetImagesParams,
  PaintingActionEntity,
  OriginalImageAttributeEntity,
  ProjectAttributeEntity,
  ValueAttributeEntity,
  GetFavoriteImagesParams,
  GetHistoryJobsParams,
  GetEditImageHistoryParams,
  GetUserProjectParams,
} from './dto/common.dto';
import { ConfigurationDto } from './dto/configuration.dto';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import {
  InspirationMethodEnum,
  InputTypeEnum,
  CreationTypeEnum,
} from '../../constant/attribute-type.enum';
import { throwError } from 'rxjs';
import { RedisService } from '../../shared/services/redis.service';
import { ActionEntityEdit } from './dto/edit-images.dto';

@Injectable()
export class AttributeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // Cache TTL constants
  private readonly ATTRIBUTE_CACHE_TTL = 3600; // 1 hour
  private readonly ATTRIBUTE_VERSION_CACHE_TTL = 3600; // 1 hour

  // Helper method to generate cache keys
  private getCacheKey(
    type: 'attribute' | 'attribute_version',
    id: string,
    version?: string,
  ): string {
    if (type === 'attribute' && version) {
      return `attr:${id}:${version}`;
    }
    return `${type}:${id}`;
  }

  // Method to invalidate cache when attributes are updated
  async invalidateAttributeCache(attributeId: string, version?: string) {
    const cacheKeys = [
      this.getCacheKey('attribute', attributeId),
      this.getCacheKey('attribute_version', attributeId),
    ];

    if (version) {
      cacheKeys.push(this.getCacheKey('attribute', attributeId, version));
    }

    await Promise.all(cacheKeys.map((key) => this.redisService.del(key)));
  }

  // create Image
  async createUserAttribute(
    attributes: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity | PaintingActionEntity | ActionEntityEdit
    >[],
  ): Promise<UserAttribute[]> {
    const results: UserAttribute[] = [];
    const cacheKeysToInvalidate: { attributeId: string; version: string }[] =
      [];

    await this.prisma.$transaction(async (tx) => {
      // For single attribute (most common case), use individual creates for return values
      if (attributes.length === 1) {
        const a = attributes[0];
        const {
          id: userId,
          attributeId,
          version,
          type,
          value,
          actions,
          batchEditId,
        } = a;

        const [attribute, attributeVersion, userAttribute] = await Promise.all([
          tx.attribute.create({
            data: {
              id: attributeId,
              version: version,
              jobId: actions?.jobId || null,
              batchEditId: batchEditId || null,
              previousVersion: null,
              type: type,
              value: JSON.parse(JSON.stringify(value)),
              actions: JSON.parse(JSON.stringify(actions)),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          tx.attributeVersion.create({
            data: {
              id: attributeId,
              version: version,
              isActive: true,
              isPublished: false,
            },
          }),
          tx.userAttribute.create({
            data: {
              userId: userId,
              attributeId: attributeId,
            },
          }),
        ]);

        results.push(userAttribute);
        cacheKeysToInvalidate.push({ attributeId, version });
      } else {
        // For multiple attributes, use batch operations
        const attributeData = [];
        const attributeVersionData = [];
        const userAttributeData = [];

        for (const a of attributes) {
          const {
            id: userId,
            attributeId,
            version,
            type,
            value,
            actions,
            batchEditId,
          } = a;

          attributeData.push({
            id: attributeId,
            version: version,
            jobId: (actions as ActionEntity)?.jobId || null,
            batchEditId: batchEditId || null,
            previousVersion: null,
            type: type,
            value: JSON.parse(JSON.stringify(value)),
            actions: JSON.parse(JSON.stringify(actions)),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          attributeVersionData.push({
            id: attributeId,
            version: version,
            isActive: true,
            isPublished: false,
          });

          userAttributeData.push({
            userId: userId,
            attributeId: attributeId,
          });

          cacheKeysToInvalidate.push({ attributeId, version });
        }

        // Execute all database operations in parallel for better performance
        const [, , userAttributes] = await Promise.all([
          tx.attribute.createMany({ data: attributeData }),
          tx.attributeVersion.createMany({ data: attributeVersionData }),
          // UserAttribute.createMany doesn't return the created records, so we use Promise.all with individual creates
          Promise.all(
            userAttributeData.map((data) => tx.userAttribute.create({ data })),
          ),
        ]);

        results.push(...userAttributes);
      }
    });

    // Invalidate cache after transaction completes for better performance
    await Promise.all(
      cacheKeysToInvalidate.map(({ attributeId, version }) =>
        this.invalidateAttributeCache(attributeId, version),
      ),
    );

    return results;
  }

  async getUserAttributesByUserId(userId: string) {
    return this.prisma.userAttribute.findMany({
      where: { userId },
    });
  }

  async getAttributeById(attributeId: string) {
    return this.prisma.attribute.findFirst({
      where: {
        id: attributeId,
      },
    });
  }

  async deleteUserAttribute(userId: string, attributeId: string) {
    return this.prisma.userAttribute.deleteMany({
      where: {
        userId,
        attributeId,
      },
    });
  }

  async getUnassignedAttributes(
    userId: string,
    limit: number,
    offset: number,
    orderBy: 'asc' | 'desc' = 'desc',
    inputType?: InputTypeEnum[],
    creationType?: CreationTypeEnum,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const inputTypeFilter =
      inputType && inputType.length > 0
        ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'inputType')::text = ANY(${inputType})`
        : Prisma.sql``;
    const creationTypeFilter = creationType
      ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'creationType')::text = ${creationType}`
      : Prisma.sql``;

    // Use cache for the first page to reduce DB pressure for common loads
    const cacheKey = `unassigned:${userId}:${limit}:${offset}:${orderBy}:${inputType?.join(',')}:${creationType}`;
    if (offset === 0) {
      const cached = await this.redisService.get<{
        data: unknown[];
        total: number;
      }>(cacheKey);
      if (cached) {
        return {
          data: cached.data as UserAttributeEntity<
            OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
            ActionEntity
          >[],
          total: cached.total,
        };
      }
    }

    // Run count and data queries in parallel since they are read-only
    // This avoids transaction timeout issues with slow jsonb_path_exists queries
    const [countResult, results] = await Promise.all([
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          ${inputTypeFilter}
          ${creationTypeFilter}
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM "UserAttribute" ua2
            JOIN "AttributeVersion" av2 ON ua2."attributeId" = av2.id
            JOIN "Attribute" a2 ON av2.id = a2.id AND av2."version" = a2."version"
            WHERE ua2."userId" = ${userId}
              AND av2."isActive" = true
              AND a2.type = 'Project'
              AND jsonb_path_exists(
                a2.value,
                format('$.folders[*].images[*] ? (@.id == "%s")', a.id)::jsonpath
              )
          )
      `,
      this.prisma.$queryRaw<
        UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        >[]
      >`
        SELECT 
          ua."userId",
          ua."attributeId",
          a."version",
          a."actions"->>'method' AS "method",
          a.value,
          a."createdAt",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          AND ua."userId" = ${userId}
          ${inputTypeFilter}
          ${creationTypeFilter}
          AND NOT EXISTS (
            SELECT 1
            FROM "UserAttribute" ua2
            JOIN "AttributeVersion" av2 ON ua2."attributeId" = av2.id
            JOIN "Attribute" a2 ON av2.id = a2.id AND av2."version" = a2."version"
            WHERE ua2."userId" = ${userId}
              AND av2."isActive" = true
              AND a2.type = 'Project'
              AND jsonb_path_exists(
                a2.value,
                format('$.folders[*].images[*] ? (@.id == "%s")', a.id)::jsonpath
              )
          )
        ORDER BY a."createdAt" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}, ua."attributeId" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const result = {
      data: results,
      total: Number(countResult[0].total),
    };

    if (offset === 0 && !inputType?.length && !creationType) {
      // cache short TTL only for simple queries without filters
      await this.redisService.set(cacheKey, result, 60); // 1 minute
    }

    return result;
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
    // Use cache for the first page to reduce DB pressure for common loads
    const cacheKey = `uploads:${userId}:${limit}:${offset}:${orderBy}`;
    if (offset === 0) {
      const cached = await this.redisService.get<{
        data: unknown[];
        total: number;
      }>(cacheKey);
      if (cached) {
        return {
          data: cached.data as UserAttributeEntity<
            OriginalImageAttributeEntity,
            ActionEntity
          >[],
          total: cached.total,
        };
      }
    }

    // Run count and data queries in parallel since they are read-only
    const [countResult, results] = await Promise.all([
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE a."type" = 'Original_Image'
          AND av."isActive" = true
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
      `,
      this.prisma.$queryRaw<
        UserAttributeEntity<OriginalImageAttributeEntity, ActionEntity>[]
      >`
        SELECT 
          ua."userId",
          ua."attributeId",
          a."version",
          a.type,
          a.value,
          a.actions,
          a."createdAt",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE a."type" = 'Original_Image'
          AND av."isActive" = true
          AND ua."userId" = ${userId}
        ORDER BY a."createdAt" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}, ua."attributeId" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const result = {
      data: results,
      total: Number(countResult[0].total),
    };

    if (offset === 0) {
      // cache short TTL only for simple queries
      await this.redisService.set(cacheKey, result, 60); // 1 minute
    }

    return result;
  }

  /**
   * Get user's generated videos
   */
  async getUserVideos(
    userId: string,
    limit: number,
    offset: number,
    orderBy: 'asc' | 'desc' = 'desc',
  ): Promise<{
    data: any[];
    total: number;
  }> {
    // Use cache for the first page to reduce DB pressure for common loads
    const cacheKey = `videos:${userId}:${limit}:${offset}:${orderBy}`;
    if (offset === 0) {
      const cached = await this.redisService.get<{
        data: unknown[];
        total: number;
      }>(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          total: cached.total,
        };
      }
    }

    // Run count and data queries in parallel since they are read-only
    const [countResult, results] = await Promise.all([
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE a."type" = 'Generated_Video'
          AND av."isActive" = true
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT 
          ua."userId",
          ua."attributeId",
          a."version",
          a.type,
          a.value,
          a.actions,
          a."createdAt",
          a."jobId",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE a."type" = 'Generated_Video'
          AND av."isActive" = true
          AND ua."userId" = ${userId}
        ORDER BY a."createdAt" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}, ua."attributeId" ${orderBy === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const result = {
      data: results,
      total: Number(countResult[0].total),
    };

    if (offset === 0) {
      // cache short TTL only for simple queries
      await this.redisService.set(cacheKey, result, 60); // 1 minute
    }

    return result;
  }

  async getUserProjects(
    params: GetUserProjectParams,
  ): Promise<UserAttributeEntity<ProjectAttributeEntity, ActionEntity>[]> {
    const { userId, orderBy, inputType, creationType } = params;

    return await this.prisma.$queryRaw`
      SELECT ${userId}::text AS "userId",
             a.id AS "attributeId",
             a."version",
             a.value,
             a.actions,
             a."createdAt",
             a."type"
      FROM "public"."Attribute" a
      JOIN "public"."AttributeVersion" av
        ON av.id = a.id AND av."version" = a."version" AND av."isActive" = TRUE
      WHERE a."type" = 'Project'
        AND EXISTS (
          SELECT 1
          FROM "public"."UserAttribute" ua
          WHERE ua."userId" = ${userId} AND ua."attributeId" = a.id
        )
        ${inputType && inputType?.length > 0 ? Prisma.sql`AND (a.actions->>'inputType')::text IN (${Prisma.join(inputType)})` : Prisma.sql``}
        ${creationType ? Prisma.sql`AND (a.actions->>'creationType')::text = ${creationType}` : Prisma.sql``}
      ORDER BY a."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
    `;
  }

  /**
   * Count user projects efficiently using COUNT query
   * @param userId - User ID to count projects for
   * @returns Number of projects the user has
   */
  async countUserProjects(userId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT a.id)::bigint AS count
      FROM "public"."Attribute" a
      JOIN "public"."AttributeVersion" av
        ON av.id = a.id AND av."version" = a."version" AND av."isActive" = TRUE
      WHERE a."type" = 'Project'
        AND EXISTS (
          SELECT 1
          FROM "public"."UserAttribute" ua
          WHERE ua."userId" = ${userId} AND ua."attributeId" = a.id
        )
    `;

    return Number(result[0]?.count || 0);
  }

  // get Assigned Image
  async getUserImages(
    userId: string,
    imageIds: string[],
    limit: number, // currentPage
    offset: number, // pageSize,  offset = (currentPage - 1) * limit
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const type = [
      InspirationMethodEnum.BASIC_TEXT_TO_IMAGE,
      InspirationMethodEnum.PRO_TEXT_TO_IMAGE,
      InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
      InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
      InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE,
      InspirationMethodEnum.PRO_IMAGE_TO_IMAGE,
    ];
    // cache first page for repeated loads
    const cacheKey = `userImages:${userId}:${imageIds.join(',')}:${limit}:${offset}`;
    if (offset === 0) {
      const cached = await this.redisService.get<{
        data: unknown[];
        total: number;
      }>(cacheKey);
      if (cached)
        return {
          data: cached.data as UserAttributeEntity<
            OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
            ActionEntity
          >[],
          total: cached.total,
        };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Count query
      const [countResult] = await tx.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          AND a.id IN (${Prisma.join(imageIds)})
          ${type.length > 0 ? Prisma.sql`AND (a.actions->>'method')::text = ANY(ARRAY[${Prisma.join(type)}]::text[])` : Prisma.sql``}
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
      `;

      // Data query
      const results = await tx.$queryRaw<
        UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        >[]
      >`
        SELECT 
          ua."userId",
          ua."attributeId",
          a."version",
          a.value,
          a.actions->>'method' AS "method",
          a."createdAt",
          a."type",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          AND ua."userId" = ${userId}
          AND a.id IN (${Prisma.join(imageIds)})
          ${type.length > 0 ? Prisma.sql`AND (a.actions->>'method')::text = ANY(ARRAY[${Prisma.join(type)}]::text[])` : Prisma.sql``}
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        data: results,
        total: Number(countResult.total),
      };
    });

    if (offset === 0) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  // get Assigned Image - Optimized version
  async getImages(
    curUserId: string,
    params: GetImagesParams,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const {
      userId,
      limit,
      offset,
      inputType = [],
      isBookmark,
      isFavorite,
      isPublished,
      orderBy,
      creationType,
    } = params;

    // Build a stable cache key only for simple queries (no cursor, no complex filters)
    const simpleCacheable =
      !isBookmark &&
      !isFavorite &&
      inputType.length === 0 &&
      creationType == null &&
      orderBy === 'desc';
    const cacheKey = `images:${curUserId}:${limit}:${offset}:${isPublished ?? 'all'}`;
    if (simpleCacheable && offset === 0) {
      const cached = await this.redisService.get<{
        data: unknown[];
        total: number;
      }>(cacheKey);
      if (cached) {
        return {
          data: cached.data as UserAttributeEntity<
            OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
            ActionEntity
          >[],
          total: cached.total,
        };
      }
    }

    // Build dynamic WHERE clauses (moved outside transaction for faster execution)
    const inputTypeFilter =
      inputType && inputType.length > 0
        ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'inputType')::text = ANY(${inputType})`
        : Prisma.sql``;
    const creationTypeFilter = creationType
      ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'creationType')::text = ${creationType}`
      : Prisma.sql``;
    const userFilter = userId
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "UserAttribute" ua WHERE ua."userId" = ${userId} AND ua."attributeId" = a.id)`
      : Prisma.sql``;
    const publishedFilter =
      isPublished !== undefined
        ? Prisma.sql`AND av."isPublished" = ${isPublished}`
        : Prisma.sql``;
    // Handle bookmark/favorite filters
    let bookmarkFilter = Prisma.sql``;
    let favoriteFilter = Prisma.sql``;

    if (isBookmark !== undefined) {
      if (isBookmark) {
        bookmarkFilter = Prisma.sql`AND EXISTS (
          SELECT 1 FROM "Bookmark" b 
          WHERE b."userId" = ${curUserId} 
            AND b."attributeId" = a.id 
            AND b."attributeVersion" = a."version"
        )`;
      } else {
        bookmarkFilter = Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM "Bookmark" b 
          WHERE b."userId" = ${curUserId} 
            AND b."attributeId" = a.id 
            AND b."attributeVersion" = a."version"
        )`;
      }
    }

    if (isFavorite !== undefined) {
      if (isFavorite) {
        favoriteFilter = Prisma.sql`AND EXISTS (
          SELECT 1 FROM "Favorite" f 
          WHERE f."userId" = ${curUserId} 
            AND f."attributeId" = a.id 
            AND f."attributeVersion" = a."version"
        )`;
      } else {
        favoriteFilter = Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM "Favorite" f 
          WHERE f."userId" = ${curUserId} 
            AND f."attributeId" = a.id 
            AND f."attributeVersion" = a."version"
        )`;
      }
    }

    // Single optimized count query
    const countQuery = Prisma.sql`
      SELECT COUNT(*) as total
      FROM "Attribute" a
      INNER JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
      WHERE a."type" = 'Generated_Image'
        AND av."isActive" = true
        ${userFilter}
        ${inputTypeFilter}
        ${creationTypeFilter}
        ${publishedFilter}
        ${bookmarkFilter}
        ${favoriteFilter}
    `;

    // Single optimized data query with all joins and editVersionNumber calculation
    const dataQuery = Prisma.sql`
      WITH filtered_ids AS (
        SELECT 
          a.id AS "attributeId"
        FROM "Attribute" a
        INNER JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          ${userFilter}
          ${inputTypeFilter}
          ${creationTypeFilter}
          ${publishedFilter}
          ${bookmarkFilter}
          ${favoriteFilter}
        ORDER BY a."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
        LIMIT ${limit} OFFSET ${offset}
      ),
      batch_versions AS (
        SELECT 
          a2.id AS "attributeId",
          a2."batchEditId",
          ROW_NUMBER() OVER (
            PARTITION BY a2."batchEditId" 
            ORDER BY a2."createdAt" ASC
          ) AS "editVersionNumber"
        FROM "Attribute" a2
        JOIN "AttributeVersion" av2 ON av2.id = a2.id AND av2."version" = a2."version"
        WHERE a2."batchEditId" IS NOT NULL
          AND av2."isActive" = true
          AND a2.id IN (SELECT "attributeId" FROM filtered_ids)
      )
      SELECT 
        ua."userId",
        ua."attributeId",
        a."version",
        a.actions->>'method' AS "method",
        a.value,
        a."createdAt",
        av."isPublished",
        a."batchEditId",
        COALESCE(bv."editVersionNumber", NULL)::int AS "editVersionNumber",
        COALESCE(fav."attributeId" IS NOT NULL, false) AS "isFavorite",
        COALESCE(bm."attributeId" IS NOT NULL, false) AS "isBookmarked"
      FROM filtered_ids f
      INNER JOIN "UserAttribute" ua ON ua."attributeId" = f."attributeId"
      INNER JOIN "Attribute" a ON ua."attributeId" = a.id
      INNER JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
      LEFT JOIN batch_versions bv ON bv."attributeId" = a.id AND a."batchEditId" IS NOT NULL
      LEFT JOIN "Favorite" fav ON fav."userId" = ${curUserId} 
        AND fav."attributeId" = ua."attributeId" 
        AND fav."attributeVersion" = a."version"
      LEFT JOIN "Bookmark" bm ON bm."userId" = ${curUserId} 
        AND bm."attributeId" = ua."attributeId" 
        AND bm."attributeVersion" = a."version"
      ORDER BY a."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
    `;

    // Execute queries in parallel WITHOUT transaction for better performance (avoids 5s timeout)
    const result = await Promise.all([
      this.prisma.$queryRaw<{ total: number }[]>(countQuery),
      this.prisma.$queryRaw<
        (UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        > & {
          isPublished: boolean;
          isFavorite: boolean;
          isBookmarked: boolean;
          method?: string;
          batchEditId?: string | null;
          editVersionNumber?: number | null;
        })[]
      >(dataQuery),
    ]).then(([countResult, results]) => {
      // Transform the results
      const transformedResults = results.map((item) => {
        // Handle createdAt - could be Date object (from DB) or string (from cache)
        const createdAtValue = item.createdAt;
        let createdAtString: string;

        try {
          if (typeof createdAtValue === 'string') {
            // It's already a string
            createdAtString = createdAtValue;
          } else if (
            createdAtValue &&
            typeof createdAtValue === 'object' &&
            typeof (createdAtValue as { toISOString?: () => string })
              .toISOString === 'function'
          ) {
            // It's a Date object
            createdAtString = (createdAtValue as Date).toISOString();
          } else {
            // Convert to Date and then to string
            createdAtString = new Date(
              String(createdAtValue || new Date()),
            ).toISOString();
          }
        } catch {
          // Fallback to current date if conversion fails
          createdAtString = new Date().toISOString();
        }

        return {
          userId: item.userId,
          attributeId: item.attributeId,
          version: item.version,
          value: item.value as unknown as
            | OriginalImageAttributeEntity
            | GeneratedImageAttributeEntity,
          // actions intentionally omitted here to reduce payload size for listing
          method: item.method,
          createdAt: createdAtString,
          type: item.type,
          isPublished: item.isPublished,
          isFavorite: item.isFavorite,
          isBookmarked: item.isBookmarked,
          batchEditId: item.batchEditId,
          editVersionNumber:
            item.editVersionNumber !== null &&
            item.editVersionNumber !== undefined
              ? Number(item.editVersionNumber)
              : undefined,
        };
      });

      return {
        data: transformedResults,
        total: Number(countResult[0].total),
      };
    });

    if (simpleCacheable && offset === 0) {
      await this.redisService.set(cacheKey, result, 30); // small TTL
    }

    return result;
  }

  async getHistoryJobs(params: GetHistoryJobsParams): Promise<{
    data: HistoryJobDto[];
    total: number;
  }> {
    const {
      userId,
      limit,
      offset,
      orderBy,
      inputType,
      creationType,
      includeEditImages = 'all',
      minDate,
    } = params;

    const inputTypeFilter =
      inputType && inputType.length > 0
        ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'inputType')::text = ANY(${inputType})`
        : Prisma.sql``;

    const creationTypeFilter = creationType
      ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'creationType')::text = ${creationType}`
      : Prisma.sql``;

    // Date filter for subscription-based history window
    // Separate filters for count query (ir_count) and data query (ir)
    const dateFilterForCount = minDate
      ? Prisma.sql`AND COALESCE(ir_count."createdAt", a."createdAt") >= ${minDate}`
      : Prisma.sql``;

    const dateFilterForData = minDate
      ? Prisma.sql`AND COALESCE(ir."createdAt", a."createdAt") >= ${minDate}`
      : Prisma.sql``;

    // Build the image type filter based on includeEditImages parameter
    let imageTypeFilter: Prisma.Sql = Prisma.sql``;
    switch (includeEditImages) {
      case 'generated-only':
        imageTypeFilter = Prisma.sql`AND (a.actions ? 'generateImageParams')`;
        break;
      case 'edited-only':
        imageTypeFilter = Prisma.sql`AND (a.actions ? 'editImageParams')`;
        break;
      default:
        imageTypeFilter = Prisma.sql`AND ((a.actions ? 'generateImageParams') OR (a.actions ? 'editImageParams'))`;
        break;
    }

    return await this.prisma.$transaction(async (tx) => {
      // Count query
      const countQuery = Prisma.sql`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        LEFT JOIN "ImageJob" ij_count ON a."jobId" = ij_count.id
        LEFT JOIN "ImageRequest" ir_count ON ij_count."requestId" = ir_count.id
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          ${imageTypeFilter}
          ${inputTypeFilter}
          ${creationTypeFilter}
          ${dateFilterForCount}
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
      `;

      // Data query with batchEditId and editVersionNumber calculation
      const dataQuery = Prisma.sql`
        WITH batch_versions AS (
          SELECT 
            a2.id AS "attributeId",
            a2."batchEditId",
            ROW_NUMBER() OVER (
              PARTITION BY a2."batchEditId" 
              ORDER BY a2."createdAt" ASC
            ) AS "editVersionNumber"
          FROM "Attribute" a2
          JOIN "AttributeVersion" av2 ON av2.id = a2.id AND av2."version" = a2."version"
          WHERE a2."batchEditId" IS NOT NULL
            AND av2."isActive" = true
        )
        SELECT 
          ua."userId", 
          ua."attributeId", 
          a."version",
          a."jobId",
          a.value, 
          a.actions, 
          a."type",
          a."createdAt",
          av."isPublished",
          ij."requestId",
          ir."createdAt" AS "batchCreatedAt",
          a."batchEditId",
          COALESCE(bv."editVersionNumber", NULL)::int AS "editVersionNumber",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        LEFT JOIN "ImageJob" ij ON a."jobId" = ij.id
        LEFT JOIN "ImageRequest" ir ON ij."requestId" = ir.id
        LEFT JOIN batch_versions bv ON bv."attributeId" = a.id AND a."batchEditId" IS NOT NULL
        WHERE ua."userId" = ${userId}
          AND a."type" = 'Generated_Image'
          AND av."isActive" = true
          ${imageTypeFilter}
          ${inputTypeFilter}
          ${creationTypeFilter}
          ${dateFilterForData}
        ORDER BY COALESCE(ir."createdAt", a."createdAt") ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult] = await tx.$queryRaw<{ total: number }[]>(countQuery);
      const results = await tx.$queryRaw<
        (UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        > & {
          isPublished: boolean;
          isFavorite: boolean;
          isBookmarked: boolean;
          requestId?: string;
          batchEditId?: string | null;
          editVersionNumber?: number | null;
        })[]
      >(dataQuery);

      const historyJobs: HistoryJobDto[] = results.map((item) => {
        // Determine if this is a generation or edit record
        const isEdit = item.actions?.editImageParams !== undefined;
        const params = isEdit
          ? item.actions.editImageParams
          : item.actions.generateImageParams;

        const modelIdSet = new Set<string>();
        const addModelValue = (value?: unknown) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach((entry) => {
              if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (trimmed) {
                  modelIdSet.add(trimmed);
                }
              }
            });
            return;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
              modelIdSet.add(trimmed);
            }
          }
        };

        const addModelsFromParams = (paramContainer?: {
          selectedModels?: unknown;
          selectedEditingModels?: unknown;
          data?: unknown;
        }) => {
          if (!paramContainer) return;

          addModelValue(
            paramContainer.selectedModels
              ? paramContainer.selectedModels
              : paramContainer.selectedEditingModels,
          );
          const dataCandidate = paramContainer.data;
          if (dataCandidate && typeof dataCandidate === 'object') {
            const typedData = dataCandidate as Record<string, unknown>;
            addModelValue(
              typedData.selectedModels
                ? typedData.selectedModels
                : typedData.selectedEditingModels,
            );
            addModelValue(typedData.modelId);
          }
        };

        if (typeof item.actions === 'object' && item.actions !== null) {
          addModelValue(
            (item.actions as Record<string, unknown>).selectedModels,
          );
        }

        if (typeof item.value === 'object' && item.value !== null) {
          const typedValue = item.value as GeneratedImageAttributeEntity & {
            selectedModels?: unknown;
          };
          addModelValue(typedValue.usedModels);
          addModelValue(typedValue.selectedModels);
        }

        addModelsFromParams(item.actions?.generateImageParams);
        addModelsFromParams(item.actions?.editImageParams);

        const selectedModels = Array.from(modelIdSet);
        const normalizedSelectedModels =
          selectedModels.length > 0 ? selectedModels : undefined;

        const extractSingleModelId = (value?: unknown): string | undefined => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || undefined;
          }
          return undefined;
        };

        const primaryModelId =
          extractSingleModelId((params as { modelId?: string })?.modelId) ||
          extractSingleModelId(
            (params?.data as { modelId?: string })?.modelId,
          ) ||
          normalizedSelectedModels?.[0];

        return {
          jobId: item.attributeId,
          requestId: item.requestId || undefined,
          creationType: params?.data?.creationType || '',
          selectedStyle: params?.data?.selectedStyle || '',
          inputType: params?.data?.inputType || '',
          imageKey: item.value?.key || '',
          uploadImage:
            params?.data && 'imagePath' in params.data
              ? (params.data as { imagePath?: string }).imagePath || ''
              : '',
          selectedSeason:
            (params?.data as { selectedSeason?: string })?.selectedSeason || '',
          selectedDaytime:
            (params?.data as { selectedDaytime?: string })?.selectedDaytime ||
            '',
          seed:
            params?.data?.seed !== undefined ? String(params.data.seed) : '',
          inputValue:
            params?.data?.inputValue !== undefined
              ? Number(params.data.inputValue)
              : 0,
          styleValue:
            params?.data?.styleValue !== undefined
              ? Number(params.data.styleValue)
              : 0,
          creativityValue:
            params?.data?.creativityValue !== undefined
              ? Number(params.data.creativityValue)
              : 0,
          // Upscale-specific fields (type casting for upscale data)
          upscaleValue:
            (params?.data as { upscaleValue?: number })?.upscaleValue !==
            undefined
              ? Number((params.data as { upscaleValue?: number }).upscaleValue)
              : 0,
          hdrValue:
            (params?.data as { hdrValue?: number })?.hdrValue !== undefined
              ? Number((params.data as { hdrValue?: number }).hdrValue)
              : 0,
          resemblanceValue:
            (params?.data as { resemblanceValue?: number })
              ?.resemblanceValue !== undefined
              ? Number(
                  (params.data as { resemblanceValue?: number })
                    .resemblanceValue,
                )
              : 0,
          fractalityValue:
            (params?.data as { fractalityValue?: number })?.fractalityValue !==
            undefined
              ? Number(
                  (params.data as { fractalityValue?: number }).fractalityValue,
                )
              : 0,
          prompt:
            typeof params?.data === 'object' &&
            'prompt' in params.data &&
            typeof params.data.prompt === 'string'
              ? params.data.prompt
              : typeof params?.data === 'object' &&
                  'promptKeywords' in params.data &&
                  typeof params.data.promptKeywords === 'string'
                ? params.data.promptKeywords
                : '',
          enhancedPrompt:
            typeof params?.data === 'object' &&
            'enhancedPrompt' in params.data &&
            typeof params.data.enhancedPrompt === 'string'
              ? params.data.enhancedPrompt
              : '',
          enabledAiPrompt:
            typeof params?.data === 'object' &&
            'enabledAiPrompt' in params.data &&
            typeof params.data.enabledAiPrompt === 'boolean'
              ? params.data.enabledAiPrompt
              : false,
          createdAt: item.actions?.createdAt
            ? new Date(item.actions.createdAt).toISOString()
            : undefined,
          isPublished: item.isPublished,
          isFavorite: item.isFavorite,
          isBookmarked: item.isBookmarked,
          userId: item.userId,
          version: item.version,
          thumbnail:
            typeof item.value === 'object' &&
            item.value !== null &&
            'thumbnail' in item.value
              ? (item.value as GeneratedImageAttributeEntity).thumbnail || ''
              : '',
          path:
            typeof item.value === 'object' &&
            item.value !== null &&
            'path' in item.value
              ? (item.value as GeneratedImageAttributeEntity).path || ''
              : '',
          dimensions:
            typeof item.value === 'object' &&
            item.value !== null &&
            'dimensions' in item.value
              ? (item.value as GeneratedImageAttributeEntity).dimensions
              : undefined,
          method: isEdit
            ? params?.method || 'EDIT'
            : params?.method || 'GENERATE',
          selectedModels: normalizedSelectedModels,
          modelId: primaryModelId,
          batchEditId: item.batchEditId,
          editVersionNumber:
            item.editVersionNumber !== null &&
            item.editVersionNumber !== undefined
              ? Number(item.editVersionNumber)
              : undefined,
        };
      });

      return {
        data: historyJobs,
        total: Number(countResult.total),
      };
    });
  }

  async getEditImageHistory(params: GetEditImageHistoryParams): Promise<{
    data: HistoryJobDto[];
    total: number;
  }> {
    const {
      userId,
      limit = 10,
      offset = 0,
      orderBy = 'desc',
      imageId,
    } = params;

    // If imageId is not provided, return empty result
    if (!imageId) {
      return {
        data: [],
        total: 0,
      };
    }

    return await this.prisma.$transaction(async (tx) => {
      // First, find the image and its batchEditId
      const imageResult = await tx.$queryRaw<
        Array<{ id: string; batchEditId: string | null }>
      >`
        SELECT a.id, a."batchEditId"
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        JOIN "UserAttribute" ua ON ua."attributeId" = a.id
        WHERE ua."userId" = ${userId}
          AND av."isActive" = true
          AND (
            a.id = ${imageId}
            OR a.value->>'path' = ${imageId}
            OR a.value->>'key' = ${imageId}
          )
        LIMIT 1
      `;

      // If image not found, return empty result
      if (!imageResult || imageResult.length === 0) {
        return {
          data: [],
          total: 0,
        };
      }

      const foundImage = imageResult[0];
      const batchEditId = foundImage.batchEditId;
      const currentAttributeId = foundImage.id;

      // If no batchEditId, just return the current image as a single item with editVersionNumber 1
      if (!batchEditId) {
        const singleImageQuery = Prisma.sql`
          SELECT 
            ua."userId", 
            ua."attributeId", 
            a."version", 
            a.value, 
            a.actions, 
            a."type",
            a."createdAt",
            av."isPublished",
            NULL AS "batchEditId",
            EXISTS (
              SELECT 1 FROM "Favorite" f
              WHERE f."userId" = ${userId}
                AND f."attributeId" = ua."attributeId"
                AND f."attributeVersion" = a."version"
            ) AS "isFavorite",
            EXISTS (
              SELECT 1 FROM "Bookmark" b
              WHERE b."userId" = ${userId}
                AND b."attributeId" = ua."attributeId"
                AND b."attributeVersion" = a."version"
            ) AS "isBookmarked"
          FROM "UserAttribute" ua
          JOIN "Attribute" a ON ua."attributeId" = a.id
          JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
          WHERE ua."userId" = ${userId}
            AND ua."attributeId" = ${currentAttributeId}
            AND av."isActive" = true
          LIMIT 1
        `;

        const singleResults = await tx.$queryRaw<
          (UserAttributeEntity<
            OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
            ActionEntity
          > & {
            isPublished: boolean;
            isFavorite: boolean;
            isBookmarked: boolean;
            batchEditId?: string | null;
          })[]
        >(singleImageQuery);

        if (!singleResults || singleResults.length === 0) {
          return {
            data: [],
            total: 0,
          };
        }

        // Map the single result to HistoryJobDto with editVersionNumber = 1
        const item = singleResults[0];
        const isOriginalImage = item.type === 'Original_Image';
        const editParams = item.actions?.editImageParams;

        const modelIdSet = new Set<string>();
        const addModelValue = (value?: unknown) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach((entry) => {
              if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (trimmed) {
                  modelIdSet.add(trimmed);
                }
              }
            });
            return;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
              modelIdSet.add(trimmed);
            }
          }
        };

        const addModelsFromParams = (paramContainer?: {
          selectedModels?: unknown;
          data?: unknown;
        }) => {
          if (!paramContainer) return;
          addModelValue(paramContainer.selectedModels);
          const dataCandidate = paramContainer.data;
          if (dataCandidate && typeof dataCandidate === 'object') {
            const typedData = dataCandidate as Record<string, unknown>;
            addModelValue(typedData.selectedModels);
            addModelValue(typedData.modelId);
          }
        };

        if (typeof item.actions === 'object' && item.actions !== null) {
          addModelValue(
            (item.actions as Record<string, unknown>).selectedModels,
          );
        }

        if (typeof item.value === 'object' && item.value !== null) {
          const typedValue = item.value as GeneratedImageAttributeEntity & {
            selectedModels?: unknown;
          };
          addModelValue(typedValue.usedModels);
          addModelValue(typedValue.selectedModels);
        }

        addModelsFromParams(editParams);

        const selectedModels = Array.from(modelIdSet);
        const normalizedSelectedModels =
          selectedModels.length > 0 ? selectedModels : undefined;

        const extractSingleModelId = (value?: unknown): string | undefined => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || undefined;
          }
          return undefined;
        };

        const primaryModelId =
          extractSingleModelId(
            (editParams as { modelId?: string } | undefined)?.modelId,
          ) ||
          extractSingleModelId(
            (editParams?.data as { modelId?: string })?.modelId,
          ) ||
          normalizedSelectedModels?.[0];

        const singleJob: HistoryJobDto = {
          jobId: item.attributeId,
          creationType: isOriginalImage
            ? 'original_upload'
            : item.actions.editImageParams?.data?.creationType || '',
          inputType: item.actions.editImageParams?.data?.inputType || '',
          imageKey: item.value?.key || '',
          uploadImage:
            item.actions?.editImageParams?.data &&
            'imagePath' in item.actions.editImageParams.data
              ? (item.actions.editImageParams.data as { imagePath?: string })
                  .imagePath || ''
              : '',
          selectedSeason:
            (
              item.actions?.editImageParams?.data as {
                selectedSeason?: string;
              }
            )?.selectedSeason || '',
          selectedDaytime:
            (
              item.actions?.editImageParams?.data as {
                selectedDaytime?: string;
              }
            )?.selectedDaytime || '',
          seed:
            item.actions?.editImageParams?.data?.seed !== undefined
              ? String(item.actions.editImageParams.data.seed)
              : '',
          inputValue:
            item.actions?.editImageParams?.data?.inputValue !== undefined
              ? Number(item.actions.editImageParams.data.inputValue)
              : 0,
          styleValue:
            item.actions?.editImageParams?.data?.styleValue !== undefined
              ? Number(item.actions.editImageParams.data.styleValue)
              : 0,
          creativityValue:
            item.actions?.editImageParams?.data?.creativityValue !== undefined
              ? Number(item.actions.editImageParams.data.creativityValue)
              : 0,
          upscaleValue:
            (item.actions?.editImageParams?.data as { upscaleValue?: number })
              ?.upscaleValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      upscaleValue?: number;
                    }
                  ).upscaleValue,
                )
              : 0,
          hdrValue:
            (item.actions?.editImageParams?.data as { hdrValue?: number })
              ?.hdrValue !== undefined
              ? Number(
                  (item.actions.editImageParams.data as { hdrValue?: number })
                    .hdrValue,
                )
              : 0,
          resemblanceValue:
            (
              item.actions?.editImageParams?.data as {
                resemblanceValue?: number;
              }
            )?.resemblanceValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      resemblanceValue?: number;
                    }
                  ).resemblanceValue,
                )
              : 0,
          fractalityValue:
            (
              item.actions?.editImageParams?.data as {
                fractalityValue?: number;
              }
            )?.fractalityValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      fractalityValue?: number;
                    }
                  ).fractalityValue,
                )
              : 0,
          prompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'prompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.prompt === 'string'
              ? item.actions.editImageParams.data.prompt
              : typeof item.actions?.editImageParams?.data === 'object' &&
                  item.actions.editImageParams.data &&
                  'promptKeywords' in item.actions.editImageParams.data &&
                  typeof item.actions.editImageParams.data.promptKeywords ===
                    'string'
                ? item.actions.editImageParams.data.promptKeywords
                : '',
          enhancedPrompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'enhancedPrompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.enhancedPrompt === 'string'
              ? item.actions.editImageParams.data.enhancedPrompt
              : '',
          enabledAiPrompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'enabledAiPrompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.enabledAiPrompt ===
              'boolean'
              ? item.actions.editImageParams.data.enabledAiPrompt
              : false,
          createdAt: item.actions?.createdAt
            ? new Date(item.actions.createdAt).toISOString()
            : item.createdAt || undefined,
          isPublished: item.isPublished,
          isFavorite: item.isFavorite,
          isBookmarked: item.isBookmarked,
          userId: item.userId,
          version: item.version,
          thumbnail:
            typeof item.value === 'object' &&
            item.value !== null &&
            'thumbnail' in item.value
              ? (item.value as GeneratedImageAttributeEntity).thumbnail || ''
              : '',
          path:
            typeof item.value === 'object' &&
            item.value !== null &&
            'path' in item.value
              ? (item.value as GeneratedImageAttributeEntity).path || ''
              : '',
          method: editParams?.method || 'EDIT',
          selectedModels: normalizedSelectedModels,
          modelId: primaryModelId,
          batchEditId: null,
          editVersionNumber: 1,
        };

        return {
          data: [singleJob],
          total: 1,
        };
      }
      // Count query for edit history - simple query using batchEditId
      const countQuery = Prisma.sql`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE av."isActive" = true
          AND a."batchEditId" = ${batchEditId}
          AND EXISTS (
            SELECT 1 FROM "UserAttribute" ua
            WHERE ua."userId" = ${userId}
              AND ua."attributeId" = a.id
          )
      `;

      // Data query for edit history - simple query using batchEditId instead of complex recursive CTEs
      const dataQuery = Prisma.sql`
        SELECT
          ua."userId", 
          ua."attributeId", 
          a."version", 
          a.value, 
          a.actions, 
          a."type",
          a."createdAt",
          av."isPublished",
          a."batchEditId",
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId}
              AND f."attributeId" = ua."attributeId"
              AND f."attributeVersion" = a."version"
          ) AS "isFavorite",
          EXISTS (
            SELECT 1 FROM "Bookmark" b
            WHERE b."userId" = ${userId}
              AND b."attributeId" = ua."attributeId"
              AND b."attributeVersion" = a."version"
          ) AS "isBookmarked"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE ua."userId" = ${userId}
          AND av."isActive" = true
          AND a."batchEditId" = ${batchEditId}
        ORDER BY a."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [countResult] = await tx.$queryRaw<{ total: number }[]>(countQuery);
      const results = await tx.$queryRaw<
        (UserAttributeEntity<
          OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
          ActionEntity
        > & {
          isPublished: boolean;
          isFavorite: boolean;
          isBookmarked: boolean;
          batchEditId?: string | null;
        })[]
      >(dataQuery);

      // Fetch all items in batch (without pagination) to calculate version numbers
      const allBatchItemsQuery = Prisma.sql`
        SELECT 
          ua."attributeId", 
          a."createdAt"
        FROM "UserAttribute" ua
        JOIN "Attribute" a ON ua."attributeId" = a.id
        JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
        WHERE ua."userId" = ${userId}
          AND av."isActive" = true
          AND a."batchEditId" = ${batchEditId}
        ORDER BY a."createdAt" ASC
      `;

      const allBatchItems =
        await tx.$queryRaw<Array<{ attributeId: string; createdAt: Date }>>(
          allBatchItemsQuery,
        );

      // Create a map of attributeId to editVersionNumber (1-based)
      const versionMap = new Map<string, number>();
      allBatchItems.forEach((item, index) => {
        versionMap.set(item.attributeId, index + 1);
      });

      const editHistoryJobs: HistoryJobDto[] = results.map((item) => {
        // Check if this is an original uploaded image
        const isOriginalImage = item.type === 'Original_Image';
        const editParams = item.actions?.editImageParams;

        const modelIdSet = new Set<string>();
        const addModelValue = (value?: unknown) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach((entry) => {
              if (typeof entry === 'string') {
                const trimmed = entry.trim();
                if (trimmed) {
                  modelIdSet.add(trimmed);
                }
              }
            });
            return;
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
              modelIdSet.add(trimmed);
            }
          }
        };

        const addModelsFromParams = (paramContainer?: {
          selectedModels?: unknown;
          data?: unknown;
        }) => {
          if (!paramContainer) return;
          addModelValue(paramContainer.selectedModels);
          const dataCandidate = paramContainer.data;
          if (dataCandidate && typeof dataCandidate === 'object') {
            const typedData = dataCandidate as Record<string, unknown>;
            addModelValue(typedData.selectedModels);
            addModelValue(typedData.modelId);
          }
        };

        if (typeof item.actions === 'object' && item.actions !== null) {
          addModelValue(
            (item.actions as Record<string, unknown>).selectedModels,
          );
        }

        if (typeof item.value === 'object' && item.value !== null) {
          const typedValue = item.value as GeneratedImageAttributeEntity & {
            selectedModels?: unknown;
          };
          addModelValue(typedValue.usedModels);
          addModelValue(typedValue.selectedModels);
        }

        addModelsFromParams(editParams);

        const selectedModels = Array.from(modelIdSet);
        const normalizedSelectedModels =
          selectedModels.length > 0 ? selectedModels : undefined;

        const extractSingleModelId = (value?: unknown): string | undefined => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || undefined;
          }
          return undefined;
        };

        const primaryModelId =
          extractSingleModelId(
            (editParams as { modelId?: string } | undefined)?.modelId,
          ) ||
          extractSingleModelId(
            (editParams?.data as { modelId?: string })?.modelId,
          ) ||
          normalizedSelectedModels?.[0];

        return {
          jobId: item.attributeId,
          creationType: isOriginalImage
            ? 'original_upload'
            : item.actions.editImageParams?.data?.creationType || '',
          inputType: item.actions.editImageParams?.data?.inputType || '',
          imageKey: item.value?.key || '',
          uploadImage:
            item.actions?.editImageParams?.data &&
            'imagePath' in item.actions.editImageParams.data
              ? (item.actions.editImageParams.data as { imagePath?: string })
                  .imagePath || ''
              : '',
          selectedSeason:
            (
              item.actions?.editImageParams?.data as {
                selectedSeason?: string;
              }
            )?.selectedSeason || '',
          selectedDaytime:
            (
              item.actions?.editImageParams?.data as {
                selectedDaytime?: string;
              }
            )?.selectedDaytime || '',
          seed:
            item.actions?.editImageParams?.data?.seed !== undefined
              ? String(item.actions.editImageParams.data.seed)
              : '',
          inputValue:
            item.actions?.editImageParams?.data?.inputValue !== undefined
              ? Number(item.actions.editImageParams.data.inputValue)
              : 0,
          styleValue:
            item.actions?.editImageParams?.data?.styleValue !== undefined
              ? Number(item.actions.editImageParams.data.styleValue)
              : 0,
          creativityValue:
            item.actions?.editImageParams?.data?.creativityValue !== undefined
              ? Number(item.actions.editImageParams.data.creativityValue)
              : 0,
          // Upscale-specific fields (type casting for upscale data)
          upscaleValue:
            (item.actions?.editImageParams?.data as { upscaleValue?: number })
              ?.upscaleValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      upscaleValue?: number;
                    }
                  ).upscaleValue,
                )
              : 0,
          hdrValue:
            (item.actions?.editImageParams?.data as { hdrValue?: number })
              ?.hdrValue !== undefined
              ? Number(
                  (item.actions.editImageParams.data as { hdrValue?: number })
                    .hdrValue,
                )
              : 0,
          resemblanceValue:
            (
              item.actions?.editImageParams?.data as {
                resemblanceValue?: number;
              }
            )?.resemblanceValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      resemblanceValue?: number;
                    }
                  ).resemblanceValue,
                )
              : 0,
          fractalityValue:
            (
              item.actions?.editImageParams?.data as {
                fractalityValue?: number;
              }
            )?.fractalityValue !== undefined
              ? Number(
                  (
                    item.actions.editImageParams.data as {
                      fractalityValue?: number;
                    }
                  ).fractalityValue,
                )
              : 0,
          prompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'prompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.prompt === 'string'
              ? item.actions.editImageParams.data.prompt
              : typeof item.actions?.editImageParams?.data === 'object' &&
                  item.actions.editImageParams.data &&
                  'promptKeywords' in item.actions.editImageParams.data &&
                  typeof item.actions.editImageParams.data.promptKeywords ===
                    'string'
                ? item.actions.editImageParams.data.promptKeywords
                : '',
          enhancedPrompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'enhancedPrompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.enhancedPrompt === 'string'
              ? item.actions.editImageParams.data.enhancedPrompt
              : '',
          enabledAiPrompt:
            typeof item.actions?.editImageParams?.data === 'object' &&
            item.actions.editImageParams.data &&
            'enabledAiPrompt' in item.actions.editImageParams.data &&
            typeof item.actions.editImageParams.data.enabledAiPrompt ===
              'boolean'
              ? item.actions.editImageParams.data.enabledAiPrompt
              : false,
          createdAt: item.actions?.createdAt
            ? new Date(item.actions.createdAt).toISOString()
            : item.createdAt || undefined,
          isPublished: item.isPublished,
          isFavorite: item.isFavorite,
          isBookmarked: item.isBookmarked,
          userId: item.userId,
          version: item.version,
          thumbnail:
            typeof item.value === 'object' &&
            item.value !== null &&
            'thumbnail' in item.value
              ? (item.value as GeneratedImageAttributeEntity).thumbnail || ''
              : '',
          path:
            typeof item.value === 'object' &&
            item.value !== null &&
            'path' in item.value
              ? (item.value as GeneratedImageAttributeEntity).path || ''
              : '',
          method: editParams?.method || 'EDIT',
          selectedModels: normalizedSelectedModels,
          modelId: primaryModelId,
          batchEditId: item.batchEditId,
          editVersionNumber: versionMap.get(item.attributeId),
        };
      });

      return {
        data: editHistoryJobs,
        total: Number(countResult.total),
      };
    });
  }

  /**
   * Get the batchEditId for a given image (by attributeId, path, or key)
   * This is used to maintain the edit chain when continuing to edit an image
   */
  async getBatchEditIdForImage(
    userId: string,
    imageId: string,
  ): Promise<string | null> {
    if (!imageId) {
      return null;
    }

    try {
      const result = await this.prisma.$queryRaw<
        Array<{ batchEditId: string | null }>
      >`
        SELECT DISTINCT a."batchEditId"
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        JOIN "UserAttribute" ua ON ua."attributeId" = a.id
        WHERE ua."userId" = ${userId}
          AND av."isActive" = true
          AND (
            a.id = ${imageId}
            OR a.value->>'path' = ${imageId}
            OR a.value->>'key' = ${imageId}
          )
        LIMIT 1
      `;

      if (result && result.length > 0 && result[0].batchEditId) {
        return result[0].batchEditId;
      }

      return null;
    } catch (error) {
      // Log error but don't throw - caller should handle null case
      console.error('Error getting batchEditId for image:', error);
      return null;
    }
  }

  /**
   * Update the batchEditId for an image (by attributeId, path, or key)
   * This is used to assign a batch ID to the original image when starting an edit chain
   */
  async updateBatchEditIdForImage(
    userId: string,
    imageId: string,
    batchEditId: string,
  ): Promise<boolean> {
    if (!imageId || !batchEditId) {
      return false;
    }

    try {
      const result = await this.prisma.$executeRaw`
        UPDATE "Attribute" a
        SET "batchEditId" = ${batchEditId}
        WHERE a.id IN (
          SELECT a.id
          FROM "Attribute" a
          JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
          JOIN "UserAttribute" ua ON ua."attributeId" = a.id
          WHERE ua."userId" = ${userId}
            AND av."isActive" = true
            AND (
              a.id = ${imageId}
              OR a.value->>'path' = ${imageId}
              OR a.value->>'key' = ${imageId}
            )
          LIMIT 1
        )
      `;

      return result > 0;
    } catch (error) {
      console.error('Error updating batchEditId for image:', error);
      return false;
    }
  }

  async getFavoriteImages(
    userId: string,
    params: GetImagesParams,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    return await this.getImagesByType(userId, params, 'Favorite');
  }

  async getBookmarkedImages(
    userId: string,
    params: GetImagesParams,
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    return await this.getImagesByType(userId, params, 'Bookmark');
  }

  async getImagesByType(
    userId: string,
    params: GetImagesParams,
    tableName: 'Favorite' | 'Bookmark',
  ): Promise<{
    data: UserAttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[];
    total: number;
  }> {
    const {
      limit,
      offset,
      inputType = [],
      orderBy,
      creationType,
      lastCreatedAt,
      lastId,
    } = params;
    const isFavoriteColumn =
      tableName === 'Favorite' ? 'isFavorite' : 'isBookmarked';

    // Use keyset pagination if cursors are provided, otherwise fall back to offset
    const useKeysetPagination = lastCreatedAt && lastId;

    const inputTypeFilter =
      inputType && inputType.length > 0
        ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'inputType')::text = ANY(${inputType})`
        : Prisma.sql``;

    const creationTypeFilter = creationType
      ? Prisma.sql`AND (a.actions->'generateImageParams'->'data'->>'creationType')::text = ${creationType}`
      : Prisma.sql``;

    return await this.prisma.$transaction(async (tx) => {
      // Count query
      const countQuery = Prisma.sql`
        SELECT COUNT(*) AS total
        FROM "Attribute" a
        JOIN "AttributeVersion" av ON av.id = a.id AND av."version" = a."version"
        WHERE a."type" = 'Generated_Image'
          AND av."isActive" = true
          ${inputTypeFilter}
          ${creationTypeFilter}
          AND EXISTS (
            SELECT 1 FROM ${Prisma.raw(`"${tableName}"`)} t
            WHERE t."userId" = ${userId}
              AND t."attributeId" = a.id
              AND t."attributeVersion" = a."version"
          )
      `;

      let dataQuery: Prisma.Sql;

      if (useKeysetPagination) {
        // Use keyset pagination for better performance
        dataQuery = Prisma.sql`
          SELECT
            t."userId",
            t."attributeId",
            a."version",
            a.actions->>'method' AS "method",
            a.value,
            t."createdAt",
            TRUE AS ${Prisma.raw(`"${isFavoriteColumn}"`)}
          FROM ${Prisma.raw(`"${tableName}"`)} t
          JOIN "Attribute" a ON t."attributeId" = a.id AND t."attributeVersion" = a."version"
          JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
          WHERE t."userId" = ${userId}
            AND a."type" = 'Generated_Image'
            AND av."isActive" = true
            ${inputTypeFilter}
            ${creationType ? Prisma.sql`AND (a.actions->>'creationType')::text = ${creationType}` : Prisma.sql``}
            AND (t."createdAt", t."attributeId") ${orderBy === 'asc' ? Prisma.sql`>` : Prisma.sql`<`} (${lastCreatedAt}, ${lastId})
          ORDER BY t."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}, t."attributeId" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
          LIMIT ${limit}
        `;
      } else {
        // Fallback to offset pagination (for first page or legacy support)
        dataQuery = Prisma.sql`
          SELECT
            t."userId",
            t."attributeId",
            a."version",
            a.value,
            a.actions->>'method' AS "method",
            t."createdAt",
            TRUE AS ${Prisma.raw(`"${isFavoriteColumn}"`)}
          FROM ${Prisma.raw(`"${tableName}"`)} t
          JOIN "Attribute" a ON t."attributeId" = a.id AND t."attributeVersion" = a."version"
          JOIN "AttributeVersion" av ON a.id = av.id AND a."version" = av."version"
          WHERE t."userId" = ${userId}
            AND a."type" = 'Generated_Image'
            AND av."isActive" = true
            ${inputTypeFilter}
            ${creationTypeFilter}
          ORDER BY t."createdAt" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}, t."attributeId" ${orderBy === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}
          ${offset !== undefined ? Prisma.sql`LIMIT ${limit} OFFSET ${offset}` : Prisma.sql`LIMIT ${limit}`}
        `;
      }

      const [countResult] = await tx.$queryRaw<{ total: number }[]>(countQuery);
      const results =
        await tx.$queryRaw<
          UserAttributeEntity<
            OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
            ActionEntity
          >[]
        >(dataQuery);

      return {
        data: results,
        total: Number(countResult.total),
      };
    });
  }

  async getUserConfigurations(
    userId: string,
  ): Promise<UserAttributeEntity<ConfigurationDto, ActionEntity>> {
    const results: UserAttributeEntity<ConfigurationDto, ActionEntity>[] =
      await this.prisma.$queryRaw`
      SELECT cua."userId",
          cua."attributeId",
          cua."version",
          cua.value,
          cua.actions,
          cua."createdAt",
          cua."type"
      FROM (
        select
          ua."userId",
          ua."attributeId",
          a."version",
          a.value,
          a.actions,
          a."createdAt",
          a."type",
          av."isActive"
        from "UserAttribute" ua
        inner join "AttributeVersion" av on
            ua."attributeId" = av.id
        inner join "Attribute" a on
          av.id = a.id and
          av."version" = a."version"
      ) AS cua
      WHERE cua.type IN ('Configuration')
      AND cua."isActive" = true
      AND cua."userId" = ${userId};
    `;
    return results[0] || null;
  }

  async createAttributeVersion(
    id: string,
    version: string,
  ): Promise<AttributeVersion> {
    return this.prisma.attributeVersion.create({
      data: {
        id,
        version,
        isActive: true,
        isPublished: false,
      },
    });
  }

  async bulkUpsertAttributes(
    userId: string,
    attributesArr: AttributeEntity<ValueAttributeEntity, ActionEntity>[],
  ): Promise<AttributeVersion[]> {
    const results: {
      id: string;
      version: string;
      isActive: boolean;
      isPublished: boolean;
    }[] = [];

    // Use a transaction to ensure atomic operations
    await this.prisma.$transaction(async (tx) => {
      for (const currentAttr of attributesArr) {
        const attributeId = currentAttr.attributeId || randomUUID();
        const newVersion = randomUUID();

        if (currentAttr.attributeId == null || currentAttr.attributeId == '') {
          // go with randomUUID
          const newRandomAttributeId: string = randomUUID();
          const newRandomAttributeVersion: string = randomUUID();
          // Insert into Attribute table
          await tx.attribute.create({
            data: {
              id: newRandomAttributeId,
              version: newRandomAttributeVersion,
              jobId: currentAttr.actions?.jobId || null,
              previousVersion: null,
              type: currentAttr.type,
              value: JSON.parse(JSON.stringify(currentAttr.value)),
              actions: JSON.parse(JSON.stringify(currentAttr.actions)),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Insert into AttributeVersion table
          await tx.attributeVersion.create({
            data: {
              id: newRandomAttributeId,
              version: newRandomAttributeVersion,
              isActive: true,
              isPublished: false,
            },
          });

          // Insert into UserAttribute table
          await tx.userAttribute.create({
            data: {
              userId: userId,
              attributeId: newRandomAttributeId,
            },
          });

          if (
            !results.some(
              (result) =>
                result.id === newRandomAttributeId &&
                result.version === newRandomAttributeVersion,
            )
          ) {
            results.push({
              id: newRandomAttributeId,
              version: newRandomAttributeVersion,
              isActive: true,
              isPublished: false,
            });
          }
        } else {
          // Check if UserAttribute exists
          const existingUserAttribute = await tx.userAttribute.findFirst({
            where: {
              userId: userId,
              attributeId: attributeId,
            },
          });

          if (existingUserAttribute) {
            // Update Attribute with new version
            await tx.attribute.create({
              data: {
                id: attributeId,
                version: newVersion,
                previousVersion: null, // Replace with logic if needed
                type: currentAttr.type,
                value: JSON.parse(JSON.stringify(currentAttr.value)),
                actions: JSON.parse(JSON.stringify(currentAttr.actions)),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Update the AttributeVersion
            await tx.attributeVersion.update({
              where: {
                id: attributeId,
                version: currentAttr.version, // or whatever the current version is
              },
              data: { version: newVersion },
            });

            if (
              !results.some(
                (result) =>
                  result.id === attributeId && result.version === newVersion,
              )
            ) {
              results.push({
                id: attributeId,
                version: newVersion,
                isActive: true,
                isPublished: false,
              });
            }
          }
        }
      }
      const userAttributes = await tx.userAttribute.findMany({
        where: {
          userId,
          attributeId: {
            in: (
              await tx.attribute.findMany({
                where: { type: 'Project' },
                select: { id: true },
              })
            ).map((attr) => attr.id),
          },
        },
        select: { attributeId: true },
      });

      const attributeIds = userAttributes.map((ua) => ua.attributeId);

      // Step 2: Update AttributeVersion records
      const excludeIds: string[] = results.map((r) => r.id);
      await tx.attributeVersion.updateMany({
        where: {
          id: { in: attributeIds, notIn: excludeIds }, // Filter IDs
        },
        data: {
          isActive: false, // Example: Update isActive or other fields
        },
      });
    });

    return results;
  }

  async updateAttributes(
    attributes: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[],
  ): Promise<
    AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[]
  > {
    const results: AttributeEntity<
      OriginalImageAttributeEntity | GeneratedImageAttributeEntity,
      ActionEntity
    >[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const a of attributes) {
        const {
          id: userId,
          attributeId,
          version,
          type,
          value,
          actions,
          isPublished,
        } = a;
        const newVersion = randomUUID();

        // Set previous version as inactive
        // await tx.attributeVersion.updateMany({
        //   where: {
        //     id: attributeId,
        //     isActive: true
        //   },
        //   data: {
        //     isActive: false
        //   }
        // });

        // Create new Attribute version
        await tx.attribute.create({
          data: {
            id: attributeId,
            version: newVersion,
            previousVersion: version,
            type: type,
            value: JSON.parse(JSON.stringify(value)),
            actions: JSON.parse(JSON.stringify(actions)),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create new AttributeVersion entry
        await tx.attributeVersion.update({
          where: {
            id: attributeId,
          },
          data: {
            version: newVersion,
            // isActive: true,
            // isPublished: isPublished
          },
        });

        // Add successfully updated attribute to results
        results.push({
          ...a,
          version: newVersion, // Update the version to the new one
        });

        // Invalidate cache for both old and new versions
        await this.invalidateAttributeCache(attributeId, version);
        await this.invalidateAttributeCache(attributeId, newVersion);
      }
    });
    return results;
  }

  async deactivateAttribute(
    attributeId: string,
  ): Promise<AttributeVersion | null> {
    try {
      // Use transaction to ensure data consistency
      return this.prisma.$transaction(async (tx) => {
        // Find the current active version
        const currentVersion = await tx.attributeVersion.findFirst({
          where: {
            id: attributeId,
            isActive: true,
          },
        });

        if (!currentVersion) {
          throw new NotFoundException(
            `Active AttributeVersion with ID ${attributeId} not found`,
          );
        }

        // Get user IDs associated with this attribute to clear their caches
        const userAttributes = await tx.userAttribute.findMany({
          where: {
            attributeId: attributeId,
          },
          select: {
            userId: true,
          },
        });

        // if (!currentVersion.isActive) {
        //   return currentVersion
        // }
        // Update the attribute version to set isActive = false
        const result = await tx.attributeVersion.update({
          where: {
            id: attributeId,
            version: currentVersion.version,
          },
          data: {
            isActive: false,
          },
        });

        // Invalidate cache for the deactivated attribute
        await this.invalidateAttributeCache(
          attributeId,
          currentVersion.version,
        );

        // Invalidate image list caches for all users who have this attribute
        const uniqueUserIds = [
          ...new Set(userAttributes.map((ua) => ua.userId)),
        ];
        for (const userId of uniqueUserIds) {
          // Invalidate all image list caches that might contain this attribute
          await Promise.all([
            this.redisService.invalidatePattern(`images:${userId}:*`),
            this.redisService.invalidatePattern(`userImages:${userId}:*`),
            this.redisService.invalidatePattern(`unassigned:${userId}:*`),
          ]);
        }

        return result;
      });
    } catch (error) {
      console.error(error);
    }
  }

  async updatePublishStatus(
    id: string,
    isPublished: boolean,
  ): Promise<AttributeVersion> {
    try {
      const updatedVersion = await this.prisma.attributeVersion.update({
        where: { id },
        data: {
          isPublished,
        },
      });

      // Invalidate cache for the updated attribute
      // Note: We need to get the current version since we only have the id
      const attribute = await this.prisma.attribute.findFirst({
        where: { id },
        orderBy: { version: 'desc' },
      });

      if (attribute) {
        await this.invalidateAttributeCache(id, attribute.version);
      }

      return updatedVersion;
    } catch (error) {
      throw new NotFoundException(`AttributeVersion with ID ${id} not found`);
    }
  }

  async updateManyPublishStatus(ids: string[] | null, isPublished: boolean) {
    const where = ids ? { id: { in: ids } } : {};

    return this.prisma.attributeVersion.updateMany({
      where,
      data: {
        isPublished,
      },
    });
  }

  // Cached method to get image path
  async getImagePath(
    imageKey: string,
    thumbnail: boolean,
  ): Promise<string | null> {
    // Try to get from cache first
    const cacheKey = this.getCacheKey('attribute', imageKey);
    let result = await this.redisService.get(cacheKey);

    if (!result) {
      // Fetch from database if not in cache
      result = await this.prisma.attribute.findFirst({
        where: {
          id: imageKey,
          type: { in: ['Generated_Image', 'Original_Image'] },
        },
        select: {
          id: true,
          value: true,
        },
      });

      // Cache the result if found
      if (result) {
        await this.redisService.set(cacheKey, result, this.ATTRIBUTE_CACHE_TTL);
      }
    }

    if (!result) {
      return null;
    }

    let imagePath: string | null = null;
    let thumbnailPath: string | null = null;

    const resultValue = (result as { value: unknown }).value;
    if (
      resultValue &&
      typeof resultValue === 'object' &&
      resultValue !== null &&
      'path' in resultValue
    ) {
      imagePath = (resultValue as { path?: string }).path ?? null;
    }
    if (
      resultValue &&
      typeof resultValue === 'object' &&
      resultValue !== null &&
      'thumbnail' in resultValue
    ) {
      thumbnailPath = (resultValue as { thumbnail?: string }).thumbnail ?? null;
    }

    return thumbnail ? thumbnailPath : imagePath;
  }

  // Fetch actions for a specific attribute (optionally for a specific version)
  async getAttributeActions(
    attributeId: string,
    version?: string,
  ): Promise<ActionEntity | null> {
    // If version is provided, prefer that exact record
    if (version) {
      const row = await this.prisma.attribute.findFirst({
        where: { id: attributeId, version },
        select: { actions: true },
      });
      return row ? (row.actions as ActionEntity) : null;
    }

    // Otherwise return the most recent actions for the attribute id
    const row = await this.prisma.attribute.findFirst({
      where: { id: attributeId },
      orderBy: { createdAt: 'desc' },
      select: { actions: true },
    });
    return row ? (row.actions as ActionEntity) : null;
  }

  async getUserImageHistory(
    userId: string,
    page = 1,
    limit = 10,
    filters: {
      inputType?: 'edit' | 'generate';
      method?: string;
      resolution?: string;
      aspectRatio?: string;
      selectedEditingModels?: string;
    } = {},
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    let whereClause = Prisma.sql`
      WHERE ua."userId" = ${userId}
    `;
    let imageTypeFilter: Prisma.Sql = Prisma.sql``;
    switch (filters.inputType) {
      case 'generate':
        imageTypeFilter = Prisma.sql`AND (a.actions ? 'generateImageParams')`;
        break;
      case 'edit':
        imageTypeFilter = Prisma.sql`AND (a.actions ? 'editImageParams')`;
        break;
      default:
        imageTypeFilter = Prisma.sql`AND ((a.actions ? 'generateImageParams') OR (a.actions ? 'editImageParams'))`;
        break;
    }

    whereClause = Prisma.sql`${whereClause} ${imageTypeFilter}`;
    const generatedImages = Prisma.sql`AND a.type = 'Generated_Image'`;
    whereClause = Prisma.sql`${whereClause} ${generatedImages}`;
    if (filters.selectedEditingModels) {
      if (filters.inputType === 'edit') {
        whereClause = Prisma.sql`${whereClause} AND (
          a.actions->'editImageParams'->'data'->'selectedEditingModels' @> ${`["${filters.selectedEditingModels}"]`}::jsonb OR
          a.actions->'generateImageParams'->'data'->'selectedModels' @> ${`["${filters.selectedEditingModels}"]`}::jsonb
        )`;
      } else {
        const imageJobFilter = Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM "ImageJob" ij
            WHERE ij.id = a."jobId"
              AND ij."modelName" = ${filters.selectedEditingModels}
          )
        `;
        whereClause = Prisma.sql`${whereClause} ${imageJobFilter}`;
      }
    }

    if (filters.method) {
      whereClause = Prisma.sql`${whereClause} AND a.actions->>'method' = ${filters.method}`;
    }

    if (filters.resolution) {
      whereClause = Prisma.sql`${whereClause} AND (
        a.actions->'editImageParams'->'data'->>'resolution' = ${filters.resolution} OR
        a.actions->'generateImageParams'->'data'->>'imageSize' = ${filters.resolution}
      )`;
    }

    if (filters.aspectRatio) {
      whereClause = Prisma.sql`${whereClause} AND (
        a.actions->'editImageParams'->'data'->>'aspectRatio' = ${filters.aspectRatio} OR
        a.actions->'generateImageParams'->'data'->>'aspectRatio' = ${filters.aspectRatio}
      )`;
    }

    const query = Prisma.sql`
      WITH deduped AS (
        SELECT a.id, a.actions, a."createdAt", a."jobId", a."batchEditId", ij."modelName" AS "modelName",
               ROW_NUMBER() OVER (PARTITION BY COALESCE(a."batchEditId", a.id) ORDER BY a."createdAt" DESC) as rn
        FROM "Attribute" a
        INNER JOIN "UserAttribute" ua ON ua."attributeId" = a.id
        LEFT JOIN "ImageJob" ij ON ij.id = a."jobId"
        ${whereClause}
      )
      SELECT id, actions, "createdAt", "jobId", "batchEditId", "modelName"
      FROM deduped
      WHERE rn = 1
      ORDER BY "createdAt" ${sort === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(*) as total
      FROM (
        SELECT 1
        FROM "Attribute" a
        INNER JOIN "UserAttribute" ua ON ua."attributeId" = a.id
        ${whereClause}
        GROUP BY COALESCE(a."batchEditId", a.id)
      ) as distinct_batches
    `;

    const [data, countResult] = await Promise.all([
      this.prisma.$queryRaw`${query}`,
      this.prisma.$queryRaw`${countQuery}`,
    ]);

    const total = Number((countResult as any)[0].total);
    return { data: data as any[], total };
  }

  async getUserImageHistoryDetail(attributeId: string): Promise<any> {
    const attribute = await this.prisma.attribute.findFirst({
      where: { id: attributeId },
    });

    if (!attribute) {
      return null;
    }

    const actions = attribute.actions as ActionEntity;

    const inputType = actions?.editImageParams ? 'edit' : 'generate';

    let provider = null;
    let model = null;
    let selectedModels = null;
    let selectedEditingModels = null;
    let imageSize = null;
    let resolution = null;
    let aspectRatio = null;
    let prompt = null;
    let enhancedPrompt = null;
    let imagePath = null;
    let referenceImages = null;

    if (inputType === 'generate') {
      if (attribute?.jobId) {
        const generationJob = await this.prisma.imageJob.findFirst({
          where: { id: attribute.jobId },
        });
        provider = generationJob?.provider || 'unknown';
        model = generationJob?.modelName || 'unknown';
      }
      const data = actions?.generateImageParams?.data as any;
      selectedModels = data?.selectedModels;
      imageSize = data?.imageSize;
      aspectRatio = data?.aspectRatio;
      prompt = data?.prompt;
      enhancedPrompt = data?.enhancedPrompt;
      imagePath = (attribute.value as any)?.path;
      referenceImages =
        (actions?.generateImageParams?.data as any)?.imagePath || null;
    } else {
      const AllBatch = await this.prisma.attribute.findMany({
        where: { batchEditId: attribute.batchEditId || attribute.id },
      });

      const ImagePath = AllBatch.map(
        (batch) => (batch.value as any)?.path,
      ).filter(Boolean);

      const data = actions?.editImageParams?.data as any;
      selectedEditingModels = data?.selectedEditingModels;
      resolution = data?.resolution;
      aspectRatio = data?.aspectRatio;
      prompt = data?.prompt;
      enhancedPrompt = data?.enhancedPrompt;
      // referenceImages = actions?.editImageParams?.data?.imagePath || null;
      referenceImages = data?.editImageParams?.data?.referenceImages;
      imagePath = ImagePath;
    }

    return {
      id: attribute.id,
      inputType,
      method: actions?.method,
      provider,
      model,
      selectedModels,
      selectedEditingModels,
      imageSize,
      resolution,
      aspectRatio,
      prompt,
      enhancedPrompt,
      imagePath,
      referenceImages,
      createdAt: attribute.createdAt,
      value: attribute.value,
    };
  }
}
