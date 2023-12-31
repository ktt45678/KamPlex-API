import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { ChapterType } from './chapter-type.schema';
import { Translations } from './translations.schema';

export type MediaChapterDocument = MediaChapter & Document;

@Schema()
export class MediaChapter {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop()
  name: string;

  @Prop({ type: () => BigInt, required: true, ref: 'ChapterType' })
  type: ChapterType;

  @Prop({ required: true })
  start: number;

  @Prop({ required: true })
  length: number;

  @Prop({ default: {} })
  _translations: Translations<TranslatedMediaChapter>;
}

export const MediaChapterSchema = SchemaFactory.createForClass(MediaChapter);

export class TranslatedMediaChapter {
  @Prop()
  name: string;
}
