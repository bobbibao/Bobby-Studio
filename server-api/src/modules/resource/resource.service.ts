import { Injectable } from '@nestjs/common';
import { ResourceRepository } from './resource.repository';
import { GenerateResourceParams } from '../attribute/dto/generate-params.dto';

@Injectable()
export class ResourceService {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  async getResourceWithPolicies(resourceId: string) {
    // return this.resourceRepository.findResourceWithPolicies(resourceId);
  }

  uploadImage(userId: string, file: Express.Multer.File) {
    // Implement the logic for handling the uploaded file
    // For example, you might log the file details or save them to a database
    return `Image uploaded for user ${userId} with filename ${file.originalname}`;
  }

  async createResource(data: any, configuration: GenerateResourceParams) {
    // Implement the logic to create a resource with the given data and configuration
    // For example, you might save both to the database
    const resourceData = {
      ...data,
      configuration, // Assuming you have a relationship between resource and configuration
    };
    // generate resource by calling the generateResource function from external service
    return await this.generateResourceFromExternalService(resourceData);

  }

  getResource(resourceId: string) {
    // Implement the logic to retrieve the resource by its ID
    // For example, you might query a database or perform some other operation
    return {}; // Replace with actual resource retrieval logic
  }

  // async getConfigurationsByRoles(roleNames: string[]): Promise<Configuration[]> {
  //   // Implement logic to fetch configurations based on role names
  //   // This is a placeholder implementation; replace with actual database query
  //   return this.resourceRepository.findConfigurationsByRoles(roleNames);
  // }
  // return i
  private async generateResourceFromExternalService(resourceData: any): Promise<any> {
    // Example implementation of calling an external service
    try {
      // Simulate an external API call
      const response = await fetch('https://external-service.com/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate resource from external service');
      }

      const generatedResource = await response.json();
      return generatedResource;
    } catch (error) {
      console.error('Error generating resource:', error);
      throw error;
    }
  }
}
