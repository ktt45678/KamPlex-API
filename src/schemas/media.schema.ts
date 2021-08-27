import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { MediaGenre } from './media-genre.schema';
import { MediaProducer } from './media-producer.schema';
import { MediaCredit } from './media-credit.schema';
import { MediaVideo } from './media-video.schema';
import { User } from './user.schema';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true, discriminatorKey: 'type' })
export class Media {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, enum: ['movie', 'tv'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  originalTitle: string;

  @Prop({ required: true, minlength: 10, maxlength: 1000 })
  overview: string;

  @Prop()
  posterUrl: string;

  @Prop()
  backdropUrl: string;

  @Prop({ type: [{ type: String, ref: 'MediaGenre' }] })
  genres: MediaGenre[];

  @Prop()
  language: string;

  @Prop({ type: [{ type: String, ref: 'MediaProducer' }] })
  producers: MediaProducer[];

  @Prop({ type: [{ type: String, ref: 'MediaCredit' }] })
  credits: MediaCredit[];

  @Prop({ required: true })
  runtime: number;

  @Prop([MediaVideo])
  videos: MediaVideo[];

  @Prop()
  adult: boolean;

  @Prop()
  releaseDate: string;

  @Prop({ required: true })
  submitted: boolean;

  @Prop({ required: true })
  verified: boolean;

  @Prop({ required: true, max: 2, min: 0 })
  visibility: number;

  @Prop({ required: true, ref: 'User' })
  addedBy: User;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ title: 1 });