import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EncodingSettingDocument = HydratedDocument<EncodingSetting>;

@Schema({ _id: false })
export class EncodingSetting {
  @Prop({ required: true })
  quality: number;

  @Prop()
  crf: number;

  @Prop()
  cq: number;

  @Prop()
  h265Crf: number;

  @Prop()
  maxrate: number;

  @Prop()
  bufsize: number;

  @Prop()
  useLowerRate: boolean;
}

export const EncodingSettingSchema = SchemaFactory.createForClass(EncodingSetting);
