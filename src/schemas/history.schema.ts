import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';

export type HistoryDocument = History & Document;

@Schema()
export class History {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: String, required: true, ref: 'User' })
  user: User;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  //@Prop()
  //episode: number;

  @Prop({ required: true, default: 0 })
  watchtime: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);

HistorySchema.index({ user: 1, media: 1, date: -1 });