import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { User } from './user.schema';

export type DriveSessionDocument = DriveSession & Document;

@Schema()
export class DriveSession {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, type: String, ref: 'ExternalStorage' })
  storage: ExternalStorage;

  @Prop({ required: true, type: String, ref: 'User' })
  user: User;

  @Prop({ required: true })
  expiry: Date;
}

export const DriveSessionSchema = SchemaFactory.createForClass(DriveSession);
