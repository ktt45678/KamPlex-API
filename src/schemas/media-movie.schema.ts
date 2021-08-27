import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { MediaCredit } from './media-credit.schema';
import { MediaGenre } from './media-genre.schema';
import { MediaProducer } from './media-producer.schema';
import { MediaVideo } from './media-video.schema';
import { MediaSource } from './media-source.schema';
import { User } from './user.schema';

export type MediaMovieDocument = MediaMovie & Document;

@Schema()
export class MediaMovie {
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
  source: MediaSource;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaMovieSchema = SchemaFactory.createForClass(MediaMovie);
