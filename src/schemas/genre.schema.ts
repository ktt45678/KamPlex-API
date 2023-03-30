import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Media } from './media.schema';
import { Translations } from './translations.schema';

export type GenreDocument = Genre & Document;

@Schema({ timestamps: true })
export class Genre {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Types.Array<Media>;

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
