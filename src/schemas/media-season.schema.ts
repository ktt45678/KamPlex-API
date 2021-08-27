import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaSeasonDocument = MediaSeason & Document;

@Schema()
export class MediaSeason {
  @Prop()
  name: string;

  @Prop({ required: true })
  key: string;
}

export const MediaSeasonSchema = SchemaFactory.createForClass(MediaSeason);
