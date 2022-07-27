import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Notification, NotificationSchema } from '../../schemas';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MongooseConnection } from '../../enums';

@Module({
  imports: [MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }], MongooseConnection.DATABASE_B)],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService]
})
export class NotificationModule { }
