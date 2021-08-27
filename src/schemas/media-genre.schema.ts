import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { Media } from './media.schema';
import { User } from './user.schema';

export type MediaGenreDocument = MediaGenre & Document;

@Schema({ timestamps: true })
export class MediaGenre {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Media[];

  @Prop({ required: true, ref: 'User' })
  addedBy: User;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(MediaGenre);
