import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { Media } from './media.schema';

export type ProductionDocument = Production & Document;

@Schema({ timestamps: true })
export class Production {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  country: string;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  media: Types.Array<Media>;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'Media' }] })
  studioMedia: Types.Array<Media>;

  createdAt: Date;

  updatedAt: Date;
}

export const ProductionSchema = SchemaFactory.createForClass(Production);
