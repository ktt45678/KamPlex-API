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
  autoNextEp: boolean;
}

@Schema({ _id: false })
export class SubtitleOptions {
  @Prop()
  fontSize: number;

  @Prop()
  fontFamily: string;

  @Prop()
  fontWeight: number;

  @Prop()
  textColor: number;

  @Prop()
  textAlpha: number;

  @Prop()
  textEdge: number;

  @Prop()
  bgColor: number;

  @Prop()
  bgAlpha: number;

  @Prop()
  winColor: number;

  @Prop()
  winAlpha: number;
}

@Schema({ _id: false })
export class HistoryOptions {
  @Prop()
  limit: number;

  @Prop()
  paused: boolean;
}

@Schema({ _id: false })
export class PlaylistOptions {
  @Prop({ default: MediaVisibility.UNLISTED })
  visibility: number;

  @Prop()
  recentId: string;
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
