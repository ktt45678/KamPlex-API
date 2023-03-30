import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { MediaVisibility, UserVisibility } from '../enums';

@Schema({ _id: false })
export class MediaPlayerOptions {
  @Prop()
  muted: boolean;

  @Prop()
  volume: number;

  @Prop()
  quality: number;

  @Prop()
  speed: number;

  @Prop()
  subtitle: boolean;

  @Prop()
  subtitleLang: string;

  @Prop()
  autoNextEpisode: boolean;
}

@Schema({ _id: false })
export class SubtitleOptions {
  @Prop()
  fontSize: number;

  @Prop()
  fontFamily: string;

  @Prop()
  textColor: number;

  @Prop()
  textOpacity: number;

  @Prop()
  textEdge: number;

  @Prop()
  backgroundColor: number;

  @Prop()
  backgroundOpacity: number;

  @Prop()
  windowColor: number;

  @Prop()
  windowOpacity: number;
}

@Schema({ _id: false })
export class HistoryOptions {
  @Prop()
  markWatchedAtPercentage: number;

  @Prop()
  paused: boolean;
}

@Schema({ _id: false })
export class PlaylistOptions {
  @Prop({ default: MediaVisibility.UNLISTED })
  defaultVisibility: number;

  @Prop()
  recentPlaylist: string;
}

@Schema({ _id: false })
export class RatingOptions {

}

@Schema({ _id: false })
export class HistoryListOptions {
  @Prop()
  view: number;

  @Prop({ required: true, default: UserVisibility.PRIVATE })
  visibility: number;
}

@Schema({ _id: false })
export class PlaylistListOptions {
  @Prop()
  view: number;
}

@Schema({ _id: false })
export class RatingListOptions {
  @Prop()
  view: number;

  @Prop()
  editMode: boolean;

  @Prop({ required: true, default: UserVisibility.PRIVATE })
  visibility: number;
}

export const MediaPlayerOptionsSchema = SchemaFactory.createForClass(MediaPlayerOptions);
export const SubtitleOptionsSchema = SchemaFactory.createForClass(SubtitleOptions);
export const HistoryOptionsSchema = SchemaFactory.createForClass(HistoryOptions);
export const PlaylistOptionsSchema = SchemaFactory.createForClass(PlaylistOptions);
export const RatingOptionsSchema = SchemaFactory.createForClass(RatingOptions);
export const HistoryListOptionsSchema = SchemaFactory.createForClass(HistoryListOptions);
export const PlaylistListOptionsSchema = SchemaFactory.createForClass(PlaylistListOptions);
export const RatingListOptionsSchema = SchemaFactory.createForClass(RatingListOptions);
