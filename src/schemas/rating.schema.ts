import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { createSnowFlakeIdAsync } from '../utils/snowflake-id.util';

export type RatingDocument = Rating & Document;

@Schema()
export class Rating {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ type: String, required: true, ref: 'User' })
  user: User;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ media: 1, user: 1 });

RatingSchema.pre('validate', async function () {
  if (!this.get('_id')) {
    const _id = await createSnowFlakeIdAsync();
    this.set('_id', _id);
  }
});