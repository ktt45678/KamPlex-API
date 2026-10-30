import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { ExternalStorage } from './external-storage.schema';
import { Media } from './media.schema';
import { TVEpisode } from './tv-episode.schema';
import { MediaSourceOptions, MediaSourceOptionsSchema } from './media-source-options.schema';
import { MediaStorageStream, MediaStorageStreamSchema } from './media-storage-stream.schema';
import { MediaStorageType } from '../enums';
import { MEDIA_STORAGE_TYPES } from '../config';

export type MediaStorageDocument = HydratedDocument<MediaStorage>;

@Schema()
export class MediaStorage {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, enum: MEDIA_STORAGE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: function () { return typeof this.path === 'string' ? false : true; } })
  path: string;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM_VIDEO; } })
  quality: number;

  @Prop()
  hdrFormat: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, default: 0 })
  size: number;

  @Prop({ type: [MediaStorageStreamSchema] })
  streams: Types.DocumentArray<MediaStorageStream>;

  @Prop({ type: MediaSourceOptionsSchema })
  options: MediaSourceOptions;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: bigint;

  @Prop({ type: () => BigInt, ref: 'TVEpisode' })
  episode: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'ExternalStorage' })
  storage: bigint;

  @Prop({ type: () => BigInt, ref: 'ExternalStorage' })
  linkedStorage: bigint;
}

export const MediaStorageSchema = SchemaFactory.createForClass(MediaStorage);
