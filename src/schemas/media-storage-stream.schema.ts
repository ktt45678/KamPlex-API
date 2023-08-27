import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaStorageType } from '../enums';
import { MEDIA_STORAGE_TYPES } from '../config';

export type MediaStorageStreamDocument = MediaStorageStream & Document;

@Schema()
export class MediaStorageStream {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, enum: MEDIA_STORAGE_TYPES })
  type: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM_VIDEO; } })
  quality: number;

  @Prop({ required: function () { return [MediaStorageType.STREAM_AUDIO, MediaStorageType.STREAM_VIDEO].includes(this.type) } })
  codec: number;

  @Prop({ required: function () { return this.type === MediaStorageType.STREAM_AUDIO; } })
  channels: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, default: 0 })
  size: number;
}

export const MediaStorageStreamSchema = SchemaFactory.createForClass(MediaStorageStream);
