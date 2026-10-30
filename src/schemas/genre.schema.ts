import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { Media } from './media.schema';
import { Translations } from './translations.schema';

export type GenreDocument = HydratedDocument<Genre>;

@Schema({ timestamps: true })
export class Genre {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<bigint>;

  @Prop({ default: {} })
  _translations: Translations<TranslatedGenre>;

  createdAt: Date;

  updatedAt: Date;
}

export const GenreSchema = SchemaFactory.createForClass(Genre);

GenreSchema.index({ '_translations.vi.name': 1 }, { unique: true, sparse: true });

export class TranslatedGenre {
  @Prop()
  name: string;
}
