import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { Translations } from './translations.schema';
import { Media } from './media.schema';
import { TVEpisode } from './tv-episode.schema';

export type ChapterTypeDocument = HydratedDocument<ChapterType>;

@Schema({ timestamps: true })
export class ChapterType {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<bigint>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'TVEpisode' }] })
  episodes: Types.Array<bigint>;

  @Prop({ default: {} })
  _translations: Translations<TranslatedChapterType>;

  createdAt: Date;

  updatedAt: Date;
}

export const ChapterTypeSchema = SchemaFactory.createForClass(ChapterType);

export class TranslatedChapterType {
  @Prop()
  name: string;
}
