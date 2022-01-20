import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, type: String, ref: 'User' })
  user: User;

  @Prop({ required: true, refPath: 'targetRef' })
  target: string;

  @Prop({ required: true, enum: ['Media'] })
  targetRef: string;

  @Prop({ required: true })
  type: number;

  @Prop({ required: true, default: false })
  read: boolean;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
