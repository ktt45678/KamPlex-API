import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaCredit } from './media-credit.schema';
import { MediaGenre } from './media-genre.schema';
import { MediaProducer } from './media-producer.schema';
import { MediaVideo } from './media-video.schema';
import { MediaSeason } from './media-season.schema';
import { User } from './user.schema';

export type MediaTVDocument = MediaTV & Document;

@Schema()
export class MediaTV {
  _id: string;

  type: string;

  title: string;

  originalTitle: string;

  overview: string;

  posterUrl: string;

  backdropUrl: string;

  genres: MediaGenre[];

  language: string;

  producers: MediaProducer[];

  credits: MediaCredit[];

  runtime: number;

  videos: MediaVideo[];

  adult: boolean;

  releaseDate: string;

  submitted: boolean;

  verified: boolean;

  visibility: number;

  addedBy: User;

  @Prop()
  episodeRuntime: number[];

  @Prop()
  firstAirDate: string;

  @Prop()
  lastAirDate: string;

  @Prop()
  seasons: MediaSeason[];

  createdAt: Date;

  updatedAt: Date;
}

export const MediaTVSchema = SchemaFactory.createForClass(MediaTV);
