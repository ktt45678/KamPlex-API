import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { Translations } from './translations.schema';

export type MediaChapterDocument = MediaChapter & Document;

@Schema()
export class MediaChapter {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  start: number;

  @Prop({ required: true })
  end: number;

  @Prop({ default: {} })
  _translations: Translations<TranslatedChapter>;
}

export const MediaChapterSchema = SchemaFactory.createForClass(MediaChapter);

export class TranslatedChapter {
  @Prop()
  name: string;
}
