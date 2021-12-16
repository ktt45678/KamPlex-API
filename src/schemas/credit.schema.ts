import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { Media } from './media.schema';
import { People } from './people.schema';
import { User } from './user.schema';

export type CreditDocument = Credit & Document;

@Schema()
export class Credit {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, enum: ['cast', 'crew'] })
  type: string;

  @Prop({ required: true })
  job: string;

  @Prop({ required: true })
  character: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Types.Array<Media>;

  @Prop({ type: String, ref: 'MediaPeople' })
  person: People;
}

export const CreditSchema = SchemaFactory.createForClass(Credit);
