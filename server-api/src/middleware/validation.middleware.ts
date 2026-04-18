import { Injectable, NestMiddleware, ValidationPipeOptions } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { CreateFeedbackDto } from '../modules/attribute/dto/create-feedback.dto';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly validationConfig = {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  };

  private getValidationOptions(method: string): ValidationPipeOptions {
    const baseOptions: ValidationPipeOptions = {
      whitelist: true,
      transform: true,
    };

    if (method === 'PUT' || method === 'PATCH') {
      return {
        ...baseOptions,
        skipMissingProperties: true,
        forbidNonWhitelisted: true,
      };
    }

    return {
      ...baseOptions,
      forbidNonWhitelisted: true,
    };
  }

  private getRouteDTO(path: string, method: string): any {
    const normalizedPath = path.includes('/api/') ? path.replace('/api/', '/') : path;
    // Map routes to DTO classes based on path and HTTP method
    const routeDtoMap: Record<string, Record<string, any>> = {
      // Add more routes and DTOs as needed
      '/feedback': {
        POST: CreateFeedbackDto,
        PUT: CreateFeedbackDto,
      },
    };

    // Return the appropriate DTO class or null if not found
    return routeDtoMap[normalizedPath]?.[method] || null;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    let path = req.originalUrl || req.url;
    path = path.split('?')[0];
    const pathParts = path.split('/').filter((p) => p);
    let basePath = '';

    if (pathParts[0] === 'api') {
      basePath = pathParts.length > 1 ? `/${pathParts[1]}` : '/';
    } else {
      basePath = pathParts.length > 0 ? `/${pathParts[0]}` : '/';
    }

    // List of routes that should be validated
    const routesToValidate = [
      '/feedback',
    ];

    // List of methods that should have body validation
    const methodsToValidate = ['POST', 'PUT', 'PATCH'];

    if (routesToValidate.includes(basePath) && methodsToValidate.includes(req.method)) {
      try {
        const dtoClass = this.getRouteDTO(basePath, req.method);
        // Only validate if we have a matching DTO
        if (dtoClass) {
          const validationOptions = this.getValidationOptions(req.method);
          const validationPipe = new ValidationPipe(validationOptions);

          req.body = await validationPipe.transform(req.body, {
            type: 'body',
            metatype: dtoClass,
          });
        }
      } catch (error) {
        // Handle validation errors
        res.status(400).json({
          statusCode: 400,
          message: Array.isArray(error.response?.message) ? error.response.message : error.message,
          error: 'Bad Request',
        });
        return;
      }
    }

    next();
  }
}
