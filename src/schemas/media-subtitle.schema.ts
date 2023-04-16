import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaStorage } from './media-storage.schema';

export type MediaSubtitleDocument = MediaSubtitle & Document;

@Schema({ _id: false })
export class MediaSubtitle {
  @Prop({ required: true })
  lang: string;

  @Prop({ required: true, type: () => BigInt, ref: 'MediaStorage' })
  storage: MediaStorage;
}

export const MediaSubtitleSchema = SchemaFactory.createForClass(MediaSubtitle);
