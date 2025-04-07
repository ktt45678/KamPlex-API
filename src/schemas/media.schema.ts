import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { Genre } from './genre.schema';
import { Production } from './production.schema';
import { MediaTag } from './media-tag.schema';
import { Credit } from './credit.schema';
import { MediaVideo, MediaVideoSchema } from './media-video.schema';
import { User } from './user.schema';
import { MediaFile, MediaFileSchema } from './media-file.schema';
import { Movie, MovieSchema } from './movie.schema';
import { TVShow, TVShowSchema } from './tv-show.schema';
import { MediaCollection } from './media-collection.schema';
import { MediaExternalIds, MediaExternalIdsSchema } from './media-external-ids.schema';
import { Translations } from './translations.schema';
import { ShortDate, ShortDateSchema } from './short-date.schema';
import { MediaScannerData, MediaScannerDataSchema } from './media-scanner-data.schema';
import { TrackableDoc } from './trackable-doc.schema';
import { MediaVisibility } from '../enums';
import { MEDIA_TYPES, MEDIA_VISIBILITY_TYPES } from '../config';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media extends TrackableDoc<Media> {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

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

  @Prop({ type: MediaFileSchema })
  poster: MediaFile;

  @Prop({ type: MediaFileSchema })
  backdrop: MediaFile;

  @Prop()
  originalLang: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Genre' }] })
  genres: Types.Array<Genre>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Production' }] })
  studios: Types.Array<Production>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Production' }] })
  producers: Types.Array<Production>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'MediaTag' }] })
  tags: Types.Array<MediaTag>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Credit' }] })
  credits: Types.Array<Credit>;

  @Prop({ required: true })
  runtime: number;

  @Prop({ type: MovieSchema })
  movie: Movie;

  @Prop({ type: TVShowSchema })
  tv: TVShow;

  @Prop({ type: [MediaVideoSchema] })
  videos: Types.Array<MediaVideo>;

  @Prop({ required: true })
  adult: boolean;

  @Prop({ required: true, type: ShortDateSchema })
  releaseDate: ShortDate;

  @Prop({ required: true })
  status: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'MediaCollection' }] })
  inCollections: Types.Array<MediaCollection>;

  @Prop({ type: MediaExternalIdsSchema, default: {} })
  externalIds: MediaExternalIds;

  @Prop({ type: MediaScannerDataSchema })
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

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
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
MediaSchema.index({ tags: 1 });
MediaSchema.index({ 'releaseDate.year': 1, 'releaseDate.month': 1, 'releaseDate.day': 1 });
MediaSchema.index({ originalLang: 1 });
MediaSchema.index({ views: 1 });
MediaSchema.index({ dailyViews: 1 });
MediaSchema.index({ weeklyViews: 1 });
MediaSchema.index({ monthlyViews: 1 });
MediaSchema.index({ ratingAverage: 1 });
MediaSchema.index({ createdAt: 1 });
MediaSchema.index({ updatedAt: 1 });

MediaSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});

export class TranslatedMedia {
  @Prop()
  title: string;

  @Prop({})
  slug: string;

  @Prop()
  overview: string;
}
