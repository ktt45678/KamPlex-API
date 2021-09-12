import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { Media } from './media.schema';
import { MediaStorageType } from '../enums/media-storage-type.enum';
import { SnowFlakeId } from '../utils/snowflake-id.util';
import { MEDIA_STORAGE_TYPES } from '../config';

export type MediaStorageDocument = MediaStorage & Document;

@Schema()
export class MediaStorage {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, enum: MEDIA_STORAGE_TYPES })
  type: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: function () { return this.type === MediaStorageType.POSTER || this.type === MediaStorageType.BACKDROP; } })
  color: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SUBTITLE; } })
  locale: string;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  quality: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  codec: string;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE; } })
  mimeType: string;

  @Prop({ type: String, required: true, ref: 'ExternalStorage' })
  media: Media;

  @Prop({ type: String, required: true, ref: 'ExternalStorage' })
  storage: ExternalStorage;
}

export const MediaStorageSchema = SchemaFactory.createForClass(MediaStorage);
