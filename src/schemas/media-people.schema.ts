import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { MediaCredit } from './media-credit.schema';

export type MediaPeopleDocument = MediaPeople & Document;

@Schema({ timestamps: true })
export class MediaPeople {
  @Prop({ default: () => new SnowFlakeId().create() })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  originalName: string;

  @Prop({ required: true, max: 2, min: 0 })
  gender: string;

  @Prop()
  birthdate: Date;

  @Prop()
  birthplace: string;

  @Prop()
  profileUrl: string;

  @Prop({ type: [{ type: String, ref: 'MediaCredit' }] })
  credits: MediaCredit[];

  @Prop({ required: true })
  submitted: boolean;

  @Prop({ required: true })
  verified: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export const MediaPeopleSchema = SchemaFactory.createForClass(MediaPeople);
