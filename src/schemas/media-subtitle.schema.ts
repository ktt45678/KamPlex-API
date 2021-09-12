import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaStorage } from './media-storage.schema';

export type MediaSubtitleDocument = MediaSubtitle & Document;

@Schema({ _id: false })
export class MediaSubtitle {
  @Prop({ required: true, unique: true })
  language: string;

  @Prop({ type: String, required: true, ref: 'MediaStorage' })
  storage: MediaStorage;
}

export const MediaSubtitleSchema = SchemaFactory.createForClass(MediaSubtitle);
