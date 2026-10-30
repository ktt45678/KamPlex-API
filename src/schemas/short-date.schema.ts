import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShortDateDocument = HydratedDocument<ShortDate>;

@Schema({ _id: false })
export class ShortDate {
  @Prop({ required: true })
  day: number;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;
}

export const ShortDateSchema = SchemaFactory.createForClass(ShortDate);
