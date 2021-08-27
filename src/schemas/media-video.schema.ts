import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaVideoDocument = MediaVideo & Document;

@Schema({ id: false })
export class MediaVideo {
  @Prop()
  name: string;

  @Prop({ required: true })
  key: string;
}

export const MediaVideoSchema = SchemaFactory.createForClass(MediaVideo);
