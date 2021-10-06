import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { ExternalStorage } from './external-storage.schema';

export type DriveSessionDocument = DriveSession & Document;

@Schema()
export class DriveSession {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, type: String, ref: 'ExternalStorage' })
  storage: ExternalStorage;

  @Prop({ expires: 604800, default: Date.now })
  createdAt: Date;
}

export const DriveSessionSchema = SchemaFactory.createForClass(DriveSession);
