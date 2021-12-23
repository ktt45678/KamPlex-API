import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaVideoDocument = MediaVideo & Document;

@Schema()
export class MediaVideo {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  site: string;

  @Prop({ required: true })
  key: string;
}

export const MediaVideoSchema = SchemaFactory.createForClass(MediaVideo);
