import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';

export type RatingDocument = Rating & Document;

@Schema()
export class Rating {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: Media;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  user: User;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ media: 1, user: 1 });
