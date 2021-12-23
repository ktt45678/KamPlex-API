import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { ShortDate } from './short-date.schema';
import { Credit } from './credit.schema';

export type PeopleDocument = People & Document;

@Schema({ timestamps: true })
export class People {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  originalName: string;

  @Prop({ required: true, max: 2, min: 0 })
  gender: string;

  @Prop({ type: ShortDate })
  birthdate: ShortDate;

  @Prop()
  birthplace: string;

  @Prop()
  profile: string;

  @Prop({ type: [{ type: String, ref: 'MediaCredit' }] })
  credits: Types.Array<Credit>;

  createdAt: Date;

  updatedAt: Date;
}

export const PeopleSchema = SchemaFactory.createForClass(People);
