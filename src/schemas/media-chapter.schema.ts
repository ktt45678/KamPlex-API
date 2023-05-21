import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ChapterType } from './chapter-type.schema';

export type MediaChapterDocument = MediaChapter & Document;

@Schema()
export class MediaChapter {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ type: () => BigInt, required: true, ref: 'ChapterType' })
  type: ChapterType;

  @Prop({ required: true })
  start: number;

  @Prop({ required: true })
  length: number;
}

export const MediaChapterSchema = SchemaFactory.createForClass(MediaChapter);
