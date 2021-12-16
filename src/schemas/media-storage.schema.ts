import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { Media } from './media.schema';
import { MediaStorageType } from '../enums/media-storage-type.enum';
import { MEDIA_STORAGE_TYPES } from '../config';

export type MediaStorageDocument = MediaStorage & Document;

@Schema()
export class MediaStorage {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, enum: MEDIA_STORAGE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: function () { return this.type === MediaStorageType.POSTER || this.type === MediaStorageType.BACKDROP; } })
  color: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SUBTITLE; } })
  language: string;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  quality: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  codec: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, required: true, ref: 'ExternalStorage' })
  media: Media;

  @Prop({ type: String, required: true, ref: 'ExternalStorage' })
  storage: ExternalStorage;
}

export const MediaStorageSchema = SchemaFactory.createForClass(MediaStorage);
