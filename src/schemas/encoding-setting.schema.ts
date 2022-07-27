import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EncodingSettingDocument = EncodingSetting & Document;

@Schema({ _id: false })
export class EncodingSetting {
  @Prop({ required: true })
  quality: number;

  @Prop()
  crf: number;

  @Prop()
  cq: number;

  @Prop()
  maxrate: number;

  @Prop()
  bufsize: number;

  @Prop()
  useLowerRate: boolean;
}

export const EncodingSettingSchema = SchemaFactory.createForClass(EncodingSetting);
