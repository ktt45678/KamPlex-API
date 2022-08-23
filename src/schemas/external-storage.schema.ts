import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { EXTERNAL_STORAGE_KIND, MEDIA_STORAGE_TYPES } from '../config';

export type ExternalStorageDocument = ExternalStorage & Document;

@Schema()
export class ExternalStorage {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: EXTERNAL_STORAGE_KIND })
  kind: number;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  clientSecret: string;

  @Prop()
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop()
  expiry: Date;

  @Prop()
  folderId: string;

  @Prop()
  folderName: string;

  @Prop()
  publicUrl: string;

  @Prop({ enum: MEDIA_STORAGE_TYPES })
  inStorage: number;

  @Prop({ default: 0 })
  used: number;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  files: Types.Array<MediaStorage>;
}

export const ExternalStorageSchema = SchemaFactory.createForClass(ExternalStorage);
