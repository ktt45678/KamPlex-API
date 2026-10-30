import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { MediaFile, MediaFileSchema } from './media-file.schema';
import { Media } from './media.schema';
import { Translations } from './translations.schema';

export type MediaCollectionDocument = HydratedDocument<MediaCollection>;

@Schema({ timestamps: true })
export class MediaCollection {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  name: string;

  @Prop()
  overview: string;

  @Prop({ type: MediaFileSchema })
  poster: MediaFile;

  @Prop({ type: MediaFileSchema })
  backdrop: MediaFile;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<bigint>;

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
