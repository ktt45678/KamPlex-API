import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { User } from './user.schema';
import { Media } from './media.schema';
import { PlaylistItem } from './playlist-item.schema';
import { MediaVisibility } from '../enums';
import { MEDIA_VISIBILITY_TYPES } from '../config';

export type PlaylistDocument = Playlist & Document;

@Schema({ timestamps: true })
export class Playlist {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop([PlaylistItem])
  items: Types.Array<PlaylistItem>;

  @Prop({ default: 0 })
  itemCount: number;

  @Prop({ type: String, required: true, ref: 'User' })
  author: User;

  @Prop({ required: true, enum: MEDIA_VISIBILITY_TYPES, default: MediaVisibility.PUBLIC })
  visibility: number;

  createdAt: Date;

  updatedAt: Date;
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);

PlaylistSchema.index({ author: 1 });
PlaylistSchema.index({ 'items.media': 1 });
PlaylistSchema.index({ name: 1 });
