import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { User } from './user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema()
export class Notification {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  user: bigint;

  @Prop({ required: true, type: () => BigInt, refPath: 'targetRef' })
  target: bigint;

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
