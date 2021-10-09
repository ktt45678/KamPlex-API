import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { SnowFlakeId } from '../utils/snowflake-id.util';

export type HistoryDocument = History & Document;

@Schema()
export class History {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'User' })
  user: User;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  //@Prop()
  //episode: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);

HistorySchema.index({ user: 1, media: 1, date: -1 });