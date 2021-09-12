import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaSubtitle } from './media-subtitle.schema';

export type MovieDocument = Movie & Document;

@Schema({ _id: false })
export class Movie {
  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  sources: Types.Array<MediaStorage>;

  @Prop([MediaSubtitle])
  subtitles: Types.Array<MediaSubtitle>;

  @Prop({ required: true, default: 0 })
  views: number;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
