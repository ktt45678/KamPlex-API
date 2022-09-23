import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaFile, MediaFileSchema } from './media-file.schema';
import { Translations } from './translations.schema';
import { ShortDate, ShortDateSchema } from './short-date.schema';
import { Media } from './media.schema';
import { MediaChapter } from './media-chapter.schema';
import { MediaExternalStreams } from './media-external-streams.schema';
import { MediaVisibility } from '../enums';
import { MEDIA_VISIBILITY_TYPES } from '../config';

export type TVEpisodeDocument = TVEpisode & Document;

@Schema({ timestamps: true })
export class TVEpisode {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  episodeNumber: number;

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

  @Prop({ type: String, ref: 'MediaStorage' })
  source: MediaStorage;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  streams: Types.Array<MediaStorage>;

  @Prop({ default: {} })
  extStreams: MediaExternalStreams;

  @Prop([MediaFile])
  subtitles: Types.Array<MediaFile>;

  @Prop([MediaChapter])
  chapters: Types.Array<MediaChapter>;

  @Prop({ required: true })
  status: number;

  @Prop({ required: true })
  pStatus: number;

  @Prop([Number])
  tJobs: Types.Array<number>;

  @Prop({ required: true, enum: MEDIA_VISIBILITY_TYPES, default: MediaVisibility.PUBLIC })
  visibility: number;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ default: {} })
  _translations: Translations<TranslatedTVEpisode>;

  createdAt: Date;

  updatedAt: Date;
}

export const TVEpisodeSchema = SchemaFactory.createForClass(TVEpisode);

TVEpisodeSchema.index({ media: 1, episodeNumber: 1 });

export class TranslatedTVEpisode {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}