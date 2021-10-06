import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';

export type MovieDocument = Movie & Document;

@Schema({ _id: false })
export class Movie {
  @Prop({ type: String, ref: 'MediaStorage' })
  source: MediaStorage;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  streams: Types.Array<MediaStorage>;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  subtitles: Types.Array<MediaStorage>;

  @Prop({ required: true, default: 0 })
  views: number;

  @Prop({ required: true })
  status: number;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
