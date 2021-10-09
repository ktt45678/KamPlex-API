import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { SnowFlakeId } from '../utils/snowflake-id.util';

export type RatingDocument = Rating & Document;

@Schema()
export class Rating {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ type: String, required: true, ref: 'User' })
  user: User;

  @Prop({ required: true })
  kind: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ media: 1, user: 1 });