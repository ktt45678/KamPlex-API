import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';

export type RatingDocument = HydratedDocument<Rating>;

@Schema()
export class Rating {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: bigint;

  @Prop({ required: true, type: () => BigInt, ref: 'User' })
  user: bigint;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ media: 1, user: 1 });
