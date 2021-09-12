import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { SnowFlakeId } from '../utils/snowflake-id.util';
import { Credit } from './credit.schema';

export type PeopleDocument = People & Document;

@Schema({ timestamps: true })
export class People {
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
  credits: Types.Array<Credit>;

  createdAt: Date;

  updatedAt: Date;
}

export const PeopleSchema = SchemaFactory.createForClass(People);
