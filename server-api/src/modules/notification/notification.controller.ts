import { Controller, Delete, Get, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('latest')
  async getLatest(@Request() req, @Query('limit') limit?: number) {
    const userId = req.currentUser.id;
    return this.notificationService.getNotifications(userId, limit ?? 10);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markNotificationAsRead(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
