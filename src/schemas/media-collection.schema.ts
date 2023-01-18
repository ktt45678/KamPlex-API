import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaFile, MediaFileSchema } from './media-file.schema';
import { Media, MediaSchema } from './media.schema';
import { Translations } from './translations.schema';

export type MediaCollectionDocument = MediaCollection & Document;

@Schema({ timestamps: true })
export class MediaCollection {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  overview: string;

  @Prop({ type: MediaFileSchema })
  poster: MediaFile;

  @Prop({ type: MediaFileSchema })
  backdrop: MediaFile;

  @Prop({ type: [MediaSchema] })
  media: Types.Array<Media>;

  @Prop({ default: 0 })
  mediaCount: number;

  @Prop({ default: {} })
  _translations: Translations<TranslatedMediaCollection>;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaCollectionSchema = SchemaFactory.createForClass(MediaCollection);

MediaCollectionSchema.index({ name: 1 });

export class TranslatedMediaCollection {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}
