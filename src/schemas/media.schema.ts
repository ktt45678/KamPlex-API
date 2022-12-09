import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Genre } from './genre.schema';
import { Production } from './production.schema';
import { Credit } from './credit.schema';
import { MediaVideo } from './media-video.schema';
import { User } from './user.schema';
import { MediaFile } from './media-file.schema';
import { Movie } from './movie.schema';
import { TVShow } from './tv-show.schema';
import { MediaCollection } from './media-collection.schema';
import { MediaExternalIds } from './media-external-ids.schema';
import { Translations } from './translations.schema';
import { ShortDate, ShortDateSchema } from './short-date.schema';
import { MediaScannerData } from './media-scanner-data.schema';
import { MediaVisibility } from '../enums';
import { MEDIA_TYPES, MEDIA_VISIBILITY_TYPES } from '../config';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, enum: MEDIA_TYPES })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  originalTitle: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  overview: string;

  @Prop(MediaFile)
  poster: MediaFile;

  @Prop(MediaFile)
  backdrop: MediaFile;

  @Prop({ type: [{ type: String, ref: 'Genre' }] })
  genres: Types.Array<Genre>;

  @Prop()
  originalLanguage: string;

  @Prop({ type: [{ type: String, ref: 'Production' }] })
  productions: Types.Array<Production>;

  @Prop({ type: [{ type: String, ref: 'Credit' }] })
  credits: Types.Array<Credit>;

  @Prop({ required: true })
  runtime: number;

  @Prop()
  movie: Movie;

  @Prop()
  tv: TVShow;

  @Prop([MediaVideo])
  videos: Types.Array<MediaVideo>;

  @Prop({ required: true })
  adult: boolean;

  @Prop({ required: true, type: ShortDateSchema })
  releaseDate: ShortDate;

  @Prop({ required: true })
  status: string;

  @Prop({ type: String, ref: 'MediaCollection' })
  inCollection: MediaCollection;

  @Prop({ default: {} })
  externalIds: MediaExternalIds;

  @Prop()
  scanner: MediaScannerData;

  @Prop({ required: true, default: 0 })
  views: number;

  @Prop({ required: true, default: 0 })
  dailyViews: number;

  @Prop({ required: true, default: 0 })
  weeklyViews: number;

  @Prop({ required: true, default: 0 })
  monthlyViews: number;

  @Prop({ required: true, default: 0 })
  ratingCount: number;

  @Prop({ required: true, default: 0 })
  ratingScore: number;

  @Prop({ required: true, default: 0 })
  ratingAverage: number;

  @Prop({ required: true })
  pStatus: number;

  @Prop({ required: true, enum: MEDIA_VISIBILITY_TYPES, default: MediaVisibility.PUBLIC })
  visibility: number;

  @Prop({ type: String, required: true, ref: 'User' })
  addedBy: User;

  @Prop({ default: {} })
  _translations: Translations<TranslatedMedia>;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ slug: 'text', '_translations.vi.slug': 'text' });
MediaSchema.index({ title: 1 });
MediaSchema.index({ genres: 1 });
MediaSchema.index({ 'releaseDate.year': 1 });
MediaSchema.index({ originalLanguage: 1 });
MediaSchema.index({ views: 1 });
MediaSchema.index({ dailyViews: 1 });
MediaSchema.index({ weeklyViews: 1 });
MediaSchema.index({ monthlyViews: 1 });
MediaSchema.index({ ratingAverage: 1 });
MediaSchema.index({ createdAt: 1 });
MediaSchema.index({ updatedAt: 1 });

export class TranslatedMedia {
  @Prop()
  title: string;

  @Prop({})
  slug: string;

  @Prop()
  overview: string;
}
