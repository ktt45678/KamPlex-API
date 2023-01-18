import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

import { ShortDate, ShortDateSchema } from './short-date.schema';
import { TVEpisode } from './tv-episode.schema';

//export type TVShowDocument = TVShow & Document;

@Schema({ _id: false })
export class TVShow {
  @Prop({ default: 0 })
  episodeCount: number;

  @Prop({ default: 0 })
  pEpisodeCount: number;

  @Prop({ type: String, ref: 'TVEpisode' })
  lastEpisode: TVEpisode;

  @Prop({ type: ShortDateSchema })
  lastAirDate: ShortDate;

  @Prop({ type: [{ type: String, ref: 'TVEpisode' }] })
  episodes: Types.Array<TVEpisode>;
}

export const TVShowSchema = SchemaFactory.createForClass(TVShow);
