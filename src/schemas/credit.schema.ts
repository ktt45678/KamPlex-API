import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Media } from './media.schema';
import { People } from './people.schema';

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

  @Prop({ type: String, ref: 'People' })
  person: People;
}

export const CreditSchema = SchemaFactory.createForClass(Credit);
