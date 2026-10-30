import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { ShortDate, ShortDateSchema } from './short-date.schema';
import { Credit } from './credit.schema';

export type PeopleDocument = HydratedDocument<People>;

@Schema({ timestamps: true })
export class People {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  originalName: string;

  @Prop({ required: true, max: 2, min: 0 })
  gender: string;

  @Prop({ type: ShortDateSchema })
  birthdate: ShortDate;

  @Prop()
  birthplace: string;

  @Prop()
  profile: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Credit' }] })
  credits: Types.Array<bigint>;

  createdAt: Date;

  updatedAt: Date;
}

export const PeopleSchema = SchemaFactory.createForClass(People);
