import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { NotificationService } from './notification.service';

@ApiTags('Notification')
@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(+id);
  }
}
