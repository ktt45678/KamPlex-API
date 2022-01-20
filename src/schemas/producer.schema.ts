import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Media } from './media.schema';

export type ProducerDocument = Producer & Document;

@Schema({ timestamps: true })
export class Producer {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  country: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Types.Array<Media>;

  createdAt: Date;

  updatedAt: Date;
}

export const ProducerSchema = SchemaFactory.createForClass(Producer);