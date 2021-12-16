import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaVisibility } from '../enums/media-visibility.enum';
import { MediaStorage } from './media-storage.schema';
import { Translations } from './translations.schema';
import { User } from './user.schema';
import { Media } from './media.schema';
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

  @Prop({ required: true })
  airDate: Date;

  @Prop({ type: String, ref: 'MediaStorage' })
  still: MediaStorage;

  @Prop({ required: true, default: 0 })
  views: number;

  @Prop({ type: String, ref: 'MediaStorage' })
  source: MediaStorage;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  streams: Types.Array<MediaStorage>;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  subtitles: Types.Array<MediaStorage>;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true, enum: MEDIA_VISIBILITY_TYPES, default: MediaVisibility.PUBLIC })
  visibility: number;

  @Prop({ type: String, required: true, ref: 'User' })
  addedBy: User;

  @Prop({ type: String, required: true, ref: 'Media' })
  media: Media;

  @Prop({ default: {} })
  _translations: Translations<TranslatedTVEpisode>;

  createdAt: Date;

  updatedAt: Date;
}

export const TVEpisodeSchema = SchemaFactory.createForClass(TVEpisode);

export class TranslatedTVEpisode {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}