import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { SnowFlakeId } from '../utils/snowflake-id.util';
import { EXTERNAL_STORAGE_KIND, MEDIA_STORAGE_TYPES } from '../config';

export type ExternalStorageDocument = ExternalStorage & Document;

@Schema()
export class ExternalStorage {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: EXTERNAL_STORAGE_KIND })
  kind: string;

  @Prop()
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop()
  expiresAt: Date;

  @Prop()
  folderId: string;

  @Prop()
  folderName: string;

  @Prop()
  publicUrl: string;

  @Prop({ enum: MEDIA_STORAGE_TYPES })
  inStorage: string;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  files: Types.Array<MediaStorage>;
}

export const ExternalStorageSchema = SchemaFactory.createForClass(ExternalStorage);
