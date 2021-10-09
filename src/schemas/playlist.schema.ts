import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { SnowFlakeId } from '../utils/snowflake-id.util';

export type PlaylistDocument = Playlist & Document;

@Schema({ timestamps: true })
export class Playlist {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'User' })
  author: User;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  createdAt: Date;

  updatedAt: Date;
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);

PlaylistSchema.index({ author: 1, media: 1 });
PlaylistSchema.index({ media: 1 });
PlaylistSchema.index({ createdAt: 1 });