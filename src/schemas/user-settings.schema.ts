import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  MediaPlayerOptions, SubtitleOptions, HistoryOptions, HistoryListOptions, PlaylistListOptions,
  RatingListOptions, MediaPlayerOptionsSchema, SubtitleOptionsSchema, HistoryOptionsSchema, HistoryListOptionsSchema,
  PlaylistListOptionsSchema, RatingListOptionsSchema, PlaylistOptionsSchema, PlaylistOptions, RatingOptionsSchema, RatingOptions
} from './user-settings-options.schema';

export type UserSettingsDocument = UserSettings & Document;

@Schema({ _id: false })
export class UserSettings {
  @Prop({ type: MediaPlayerOptionsSchema, default: () => ({}) })
  player: MediaPlayerOptions;

  @Prop({ type: SubtitleOptionsSchema, default: () => ({}) })
  subtitle: SubtitleOptions;

  @Prop({ type: HistoryOptionsSchema, default: () => ({}) })
  history: HistoryOptions;

  @Prop({ type: PlaylistOptionsSchema, default: () => ({}) })
  playlist: PlaylistOptions;

  @Prop({ type: RatingOptionsSchema, default: () => ({}) })
  rating: RatingOptions;

  @Prop({ type: HistoryListOptionsSchema, default: () => ({}) })
  historyList: HistoryListOptions;

  @Prop({ type: PlaylistListOptionsSchema, default: () => ({}) })
  playlistList: PlaylistListOptions;

  @Prop({ type: RatingListOptionsSchema, default: () => ({}) })
  ratingList: RatingListOptions;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
