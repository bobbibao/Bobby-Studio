import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFeedbackDto } from '../attribute/dto/create-feedback.dto';
import { FeedbackRepository } from './feedback.repository';
import { FeedbackType } from 'src/constant/feedback.enum';

@Injectable()
export class FeedbackService {
  constructor(private feedbackRepository: FeedbackRepository) {}

  async create(createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackRepository.createFeedback(createFeedbackDto);
  }

  async update(userId: string, attributeId: string, version: string, updateData: Partial<CreateFeedbackDto>) {
    try {
      return await this.feedbackRepository.updateFeedback(userId, attributeId, version, updateData);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Feedback not found for user ${userId} and attribute ${attributeId}`);
      }
      throw error;
    }
  }

  async delete(userId: string, attributeId: string, version: string) {
    try {
      return await this.feedbackRepository.deleteFeedback(userId, attributeId, version);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Feedback not found for user ${userId} and attribute ${attributeId}`);
      }
      throw error;
    }
  }

  async findOneByAttribute(attributeId: string) {
    const attribute = await this.feedbackRepository.findAttributeById(attributeId);
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${attributeId} not found`);
    }

    return this.feedbackRepository.findFeedbackByAttribute(attributeId, attribute.version);
  }

  async findAllByAttribute(attributeId: string) {
    const attribute = await this.feedbackRepository.findAttributeById(attributeId);
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${attributeId} not found`);
    }

    return this.feedbackRepository.findAllFeedbacksByAttribute(attributeId, attribute.version);
  }

  async findUserFeedback(userId: string, attributeId: string, version: string) {
    return this.feedbackRepository.findUserFeedback(userId, attributeId, version);
  }

  async createOrUpdateFeedback(createFeedbackDto: CreateFeedbackDto) {
    const { userId, attributeId, type, categories, comment } = createFeedbackDto;

    const attribute = await this.feedbackRepository.findAttributeById(attributeId);
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${attributeId} not found`);
    }

    const version = attribute.version;

    if (type !== FeedbackType.POSITIVE && type !== FeedbackType.NEGATIVE) {
      throw new BadRequestException('Feedback type must be either "positive" or "negative"');
    }

    if (!Array.isArray(categories)) {
      throw new BadRequestException('Categories must be an array');
    }

    const nonStringCategories = categories.filter((category) => typeof category !== 'string');
    if (nonStringCategories.length > 0) {
      throw new BadRequestException('All categories must be strings');
    }

    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      throw new BadRequestException('Comment must be a string, null, or undefined');
    }

    if (typeof comment === 'string' && comment.length > 1000) {
      throw new BadRequestException('Comment must not exceed 1000 characters');
    }

    const existingFeedback = await this.findUserFeedback(userId, attributeId, version);

    if (existingFeedback) {
      return this.update(userId, attributeId, version, {
        type: createFeedbackDto.type,
        categories: createFeedbackDto.categories,
        comment: createFeedbackDto.comment,
      });
    }

    createFeedbackDto.version = version;
    return this.create(createFeedbackDto);
  }

  async deleteFeedback(userId: string, attributeId: string) {
    const attribute = await this.feedbackRepository.findAttributeById(attributeId);
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${attributeId} not found`);
    }

    const version = attribute.version;

    const existingFeedback = await this.findUserFeedback(userId, attributeId, version);
    if (!existingFeedback) {
      throw new NotFoundException(`Feedback not found for this attribute`);
    }

    return this.delete(userId, attributeId, version);
  }
}
