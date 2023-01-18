import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaFile, MediaFileSchema } from './media-file.schema';
import { MediaChapter, MediaChapterSchema } from './media-chapter.schema';
import { MediaExternalStreams } from './media-external-streams.schema';

//export type MovieDocument = Movie & Document;

@Schema({ _id: false })
export class Movie {
  @Prop({ type: String, ref: 'MediaStorage' })
  source: MediaStorage;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  streams: Types.Array<MediaStorage>;

  @Prop({ default: {} })
  extStreams: MediaExternalStreams;

  @Prop({ type: [MediaFileSchema] })
  subtitles: Types.Array<MediaFile>;

  @Prop({ type: [MediaChapterSchema] })
  chapters: Types.Array<MediaChapter>;

  @Prop({ required: true })
  status: number;

  @Prop([Number])
  tJobs: Types.Array<number>;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
