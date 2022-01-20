import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { Media } from './media.schema';
import { TVEpisode } from './tv-episode.schema';
import { MediaStorageType } from '../enums';
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

  @Prop({
    required: function () {
      return this.type === MediaStorageType.SOURCE || this.type === MediaStorageType.STREAM;
    }
  })
  path: string;

  @Prop({ required: function () { return this.type === MediaStorageType.POSTER || this.type === MediaStorageType.BACKDROP; } })
  color: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SUBTITLE; } })
  language: string;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM; } })
  quality: number;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM; } })
  codec: number;

  @Prop({ required: function () { return this.type === MediaStorageType.SOURCE || this.type === MediaStorageType.STREAM; } })
  mimeType: string;

  @Prop({ required: true, default: 0 })
  size: number;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ type: String, ref: 'TVEpisode' })
  episode: TVEpisode;

  @Prop({
    type: String, required: function () {
      return this.type === MediaStorageType.SOURCE || this.type === MediaStorageType.STREAM;
    }, ref: 'ExternalStorage'
  })
  storage: ExternalStorage;
}

export const MediaStorageSchema = SchemaFactory.createForClass(MediaStorage);
