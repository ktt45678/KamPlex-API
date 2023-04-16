import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { TVEpisode } from './tv-episode.schema';

export type HistoryDocument = History & Document;

@Schema()
export class History {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ type: () => BigInt, required: true, ref: 'User' })
  user: User;

  @Prop({ type: () => BigInt, required: true, ref: 'Media' })
  media: Media;

  @Prop({ type: () => BigInt, ref: 'TVEpisode' })
  episode: TVEpisode;

  @Prop({ required: true, default: 0 })
  time: number;

  @Prop({ required: true, default: false })
  paused: boolean;

  @Prop({ required: true, default: 0 })
  watched: number;

  @Prop({ required: true, default: Date.now })
  date: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);

HistorySchema.index({ user: 1 });
HistorySchema.index({ media: 1 });
HistorySchema.index({ date: 1 });
