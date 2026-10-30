import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { MediaStorage } from './media-storage.schema';

export type MediaSubtitleDocument = HydratedDocument<MediaSubtitle>;

@Schema({ _id: false })
export class MediaSubtitle {
  @Prop({ required: true })
  lang: string;

  @Prop({ required: true, type: () => BigInt, ref: 'MediaStorage' })
  storage: bigint;
}

export const MediaSubtitleSchema = SchemaFactory.createForClass(MediaSubtitle);
