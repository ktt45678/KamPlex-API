import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Media } from './media.schema';

export type ProductionDocument = Production & Document;

@Schema({ timestamps: true })
export class Production {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  country: string;

  @Prop({ type: [{ type: String, ref: 'Media' }] })
  media: Types.Array<Media>;

  createdAt: Date;

  updatedAt: Date;
}

export const ProductionSchema = SchemaFactory.createForClass(Production);
