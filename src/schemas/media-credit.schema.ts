import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { Media } from './media.schema';
import { MediaPeople } from './media-people.schema';
import { User } from './user.schema';

export type MediaCreditDocument = MediaCredit & Document;

@Schema()
export class MediaCredit {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, enum: ['cast', 'crew'] })
  type: string;

  @Prop({ required: true })
  job: string;

  @Prop({ required: true })
  character: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Media[];

  @Prop({ type: String, ref: 'MediaPeople' })
  person: MediaPeople;

  @Prop({ required: true, ref: 'User' })
  addedBy: User;
}

export const MediaCreditSchema = SchemaFactory.createForClass(MediaCredit);
