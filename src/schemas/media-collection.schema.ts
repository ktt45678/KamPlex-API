import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaFile } from './media-file.schema';
import { Media } from './media.schema';
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

  @Prop(MediaFile)
  poster: MediaFile;

  @Prop(MediaFile)
  backdrop: MediaFile;

  @Prop([Media])
  media: Types.Array<Media>;

  @Prop({ default: 0 })
  mediaCount: number;

  @Prop({ default: {} })
  _translations: Translations<TranslatedMediaCollection>;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaCollectionSchema = SchemaFactory.createForClass(MediaCollection);

MediaCollectionSchema.index({ 'name': 1 });

export class TranslatedMediaCollection {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}
