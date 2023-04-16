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
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, enum: MEDIA_STORAGE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM; } })
  quality: number;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM; } })
  codec: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, default: 0 })
  size: number;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: Media;

  @Prop({ type: () => BigInt, ref: 'TVEpisode' })
  episode: TVEpisode;

  @Prop({ required: true, type: () => BigInt, ref: 'ExternalStorage' })
  storage: ExternalStorage;
}

export const MediaStorageSchema = SchemaFactory.createForClass(MediaStorage);
