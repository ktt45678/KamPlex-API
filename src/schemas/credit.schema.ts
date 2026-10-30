import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

import { Media } from './media.schema';
import { People } from './people.schema';

export type CreditDocument = HydratedDocument<Credit>;

@Schema()
export class Credit {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, enum: ['cast', 'crew'] })
  type: string;

  @Prop({ required: true })
  job: string;

  @Prop({ required: true })
  character: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<bigint>;

  @Prop({ type: () => BigInt, ref: 'People' })
  person: bigint;
}

export const CreditSchema = SchemaFactory.createForClass(Credit);
