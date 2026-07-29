import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaFile, MediaFileSchema } from './media-file.schema';
import { MediaChapter, MediaChapterSchema } from './media-chapter.schema';
import { TranscodeJob, TranscodeJobSchema } from './transcode-job.schema';

//export type MovieDocument = Movie & Document;

@Schema({ _id: false })
export class Movie {
  @Prop({ type: () => BigInt, ref: 'MediaStorage' })
  source: MediaStorage;

  // @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'MediaStorage' }] })
  // streams: Types.Array<MediaStorage>;

  @Prop({ type: [MediaFileSchema] })
  subtitles: Types.Array<MediaFile>;

  @Prop({ type: [MediaChapterSchema] })
  chapters: Types.Array<MediaChapter>;

  @Prop({ required: true })
  status: number;

  @Prop({ type: [TranscodeJobSchema] })
  tJobs: Types.DocumentArray<TranscodeJob>;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
