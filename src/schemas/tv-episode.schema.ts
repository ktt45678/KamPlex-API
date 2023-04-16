import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaFile, MediaFileSchema } from './media-file.schema';
import { Translations } from './translations.schema';
import { ShortDate, ShortDateSchema } from './short-date.schema';
import { Media } from './media.schema';
import { MediaChapter, MediaChapterSchema } from './media-chapter.schema';
import { TrackableDoc } from './trackable-doc.schema';
import { MediaVisibility } from '../enums';
import { MEDIA_VISIBILITY_TYPES } from '../config';

export type TVEpisodeDocument = TVEpisode & Document;

@Schema({ timestamps: true })
export class TVEpisode extends TrackableDoc<TVEpisode> {
  @Prop({ type: () => BigInt, required: true })
  _id: bigint;

  @Prop({ required: true })
  epNumber: number;

  @Prop()
  name: string;

  @Prop()
  overview: string;

  @Prop({ required: true })
  runtime: number;

  @Prop({ required: true, type: ShortDateSchema })
  airDate: ShortDate;

  @Prop({ type: MediaFileSchema })
  still: MediaFile;

  @Prop({ required: true, default: 0 })
  views: number;

  @Prop({ type: () => BigInt, ref: 'MediaStorage' })
  source: MediaStorage;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'MediaStorage' }] })
  streams: Types.Array<MediaStorage>;

  @Prop({ type: [MediaFileSchema] })
  subtitles: Types.Array<MediaFile>;

  @Prop({ type: [MediaChapterSchema] })
  chapters: Types.Array<MediaChapter>;

  @Prop({ required: true })
  status: number;

  @Prop({ required: true })
  pStatus: number;

  @Prop([Number])
  tJobs: Types.Array<number>;

  @Prop({ required: true, enum: MEDIA_VISIBILITY_TYPES, default: MediaVisibility.PUBLIC })
  visibility: number;

  @Prop({ required: true, type: () => BigInt, ref: 'Media' })
  media: Media;

  @Prop({ default: {} })
  _translations: Translations<TranslatedTVEpisode>;

  createdAt: Date;

  updatedAt: Date;
}

export const TVEpisodeSchema = SchemaFactory.createForClass(TVEpisode);

TVEpisodeSchema.index({ media: 1, epNumber: 1 });

TVEpisodeSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});

export class TranslatedTVEpisode {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}
