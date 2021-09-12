import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { MediaStorage } from './media-storage.schema';
import { MediaSubtitle } from './media-subtitle.schema';
import { Translations } from './translations.schema';

export type TVEpisodeDocument = TVEpisode & Document;

@Schema()
export class TVEpisode {
  @Prop({ required: true })
  airDate: Date;

  @Prop({ required: true })
  episodeNumber: number;

  @Prop()
  name: string;

  @Prop()
  overview: string;

  @Prop({ type: String, ref: 'MediaStorage' })
  still: MediaStorage;

  @Prop({ required: true, default: 0 })
  views: number;

  @Prop({ type: [{ type: String, ref: 'MediaStorage' }] })
  sources: Types.Array<MediaStorage>;

  @Prop([MediaSubtitle])
  subtitles: Types.Array<MediaSubtitle>;

  @Prop({ default: {} })
  _translations: Translations<TranslatedTVEpisode>;
}

export const TVEpisodeSchema = SchemaFactory.createForClass(TVEpisode);

export class TranslatedTVEpisode {
  @Prop()
  name: string;

  @Prop()
  overview: string;
}