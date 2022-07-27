import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateNotificationDto, UpdateNotificationDto } from './dto';
import { Notification, NotificationDocument } from '../../schemas';
import { MongooseConnection } from '../../enums';

@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification.name, MongooseConnection.DATABASE_B) private notificationModel: Model<NotificationDocument>) { }

  create(createNotificationDto: CreateNotificationDto) {
    return 'This action adds a new notification';
  }

  findAll() {
    return `This action returns all notification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
