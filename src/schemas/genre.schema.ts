import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Media } from './media.schema';
import { TrackableDoc } from './trackable-doc.schema';
import { Translations } from './translations.schema';

export type GenreDocument = Genre & Document;

@Schema({ timestamps: true })
export class Genre extends TrackableDoc<Genre> {
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

GenreSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});

export class TranslatedGenre {
  @Prop()
  name: string;
}
