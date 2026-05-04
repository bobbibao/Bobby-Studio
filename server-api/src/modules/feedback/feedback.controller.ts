import { Controller, Get, Post, Body, Param, UseGuards, Request, Delete, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from '../attribute/dto/create-feedback.dto';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@ApiTags('Feedback image')
@ApiBearerAuth()
@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // create feedback
  @Post()
  @ApiOperation({ summary: 'Create new feedback', description: 'Creates a new feedback for an image attribute' })
  @ApiBody({
    type: CreateFeedbackDto,
    description: 'Feedback data to be created'
  })
  @ApiResponse({
    status: 201,
    description: 'The feedback has been successfully created.',
    type: CreateFeedbackDto
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() req) {
    createFeedbackDto.userId = req.currentUser.id;
    return this.feedbackService.createOrUpdateFeedback(createFeedbackDto);
  }

  // get feedback by attributeId
  @Get('attribute/:attributeId')
  @ApiParam({ name: 'attributeId', description: 'ID attribute', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'The feedback image',
    type: CreateFeedbackDto
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAttributeById(@Param('attributeId') attributeId: string) {
    return this.feedbackService.findOneByAttribute(attributeId);
  }

  // update feedback
  @Put('attribute/:attributeId')
  @ApiOperation({ summary: 'Update feedback', description: 'Update a feedback for an image attribute' })
  @ApiBody({
    type: CreateFeedbackDto,
    description: 'Feedback data to be updated'
  })
  @ApiResponse({
    status: 200,
    description: 'The feedback has been successfully updated.',
    type: CreateFeedbackDto
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(
    @Param('attributeId') attributeId: string,
    @Body() updateData: Partial<CreateFeedbackDto>,
    @Request() req
  ) {
    const feedbackDto = new CreateFeedbackDto();
    feedbackDto.userId = req.currentUser.id;
    feedbackDto.attributeId = attributeId;

    if (updateData.type) feedbackDto.type = updateData.type;
    if (updateData.categories) feedbackDto.categories = updateData.categories;
    if ('comment' in updateData) feedbackDto.comment = updateData.comment;

    return this.feedbackService.createOrUpdateFeedback(feedbackDto);
  }

  // delete feedback
  @Delete('attribute/:attributeId')
  @ApiOperation({ summary: 'Delete feedback', description: 'Delete a feedback for an image attribute' })
  @ApiResponse({
    status: 200,
    description: 'The feedback has been successfully deleted.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  delete(@Param('attributeId') attributeId: string, @Request() req) {
    const userId = req.currentUser.id;
    return this.feedbackService.deleteFeedback(userId, attributeId);
  }
}
