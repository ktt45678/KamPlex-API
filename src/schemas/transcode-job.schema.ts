import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class TranscodeJob {
  @Prop({ required: true })
  codec: number;

  @Prop([Number])
  ids: number[];
}

export const TranscodeJobSchema = SchemaFactory.createForClass(TranscodeJob);
