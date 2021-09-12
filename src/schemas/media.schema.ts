import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { Genre } from './genre.schema';
import { Producer } from './producer.schema';
import { Credit } from './credit.schema';
import { MediaVideo } from './media-video.schema';
import { User } from './user.schema';
import { MediaStorage } from './media-storage.schema';
import { Movie } from './movie.schema';
import { TVShow } from './tv-show.schema';
import { Translations } from './translations.schema';
import { MEDIA_TYPES } from '../config';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({ default: () => new SnowFlakeId().create() })
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

  @Prop({ type: String, ref: 'MediaStorage' })
  poster: MediaStorage;

  @Prop({ type: String, ref: 'MediaStorage' })
  backdrop: MediaStorage;

  @Prop({ type: [{ type: String, ref: 'Genre' }] })
  genres: Types.Array<Genre>;

  @Prop()
  originalLanguage: string;

  @Prop({ type: [{ type: String, ref: 'Producer' }] })
  producers: Types.Array<Producer>;

  @Prop({ type: [{ type: String, ref: 'Credit' }] })
  credits: Types.Array<Credit>;

  @Prop({ required: true })
  runtime: number;

  @Prop()
  movie: Movie;

  @Prop()
  tvShow: TVShow;

  @Prop([MediaVideo])
  videos: Types.Array<MediaVideo>;

  @Prop({ required: true })
  adult: boolean;

  @Prop({ required: true })
  releaseDate: Date;

  @Prop({ required: true })
  submitted: boolean;

  @Prop({ required: true })
  verified: boolean;

  @Prop({ required: true, max: 2, min: 0, default: 0 })
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
MediaSchema.index({ type: 1 });
MediaSchema.index({ genres: 1 });
MediaSchema.index({ originalLanguage: 1 }, { sparse: true });
MediaSchema.index({ releaseDate: 1 });
MediaSchema.index({ adult: 1 });

export class TranslatedMedia {
  @Prop()
  title: string;

  @Prop({})
  slug: string;

  @Prop()
  overview: string;
}