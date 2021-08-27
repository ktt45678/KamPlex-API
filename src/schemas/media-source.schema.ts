import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaSourceDocument = MediaSource & Document;

@Schema()
export class MediaSource {
  @Prop()
  name: string;

  @Prop({ required: true })
  key: string;
}

export const MediaSourceSchema = SchemaFactory.createForClass(MediaSource);
