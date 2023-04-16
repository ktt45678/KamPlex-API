import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

import { ShortDate, ShortDateSchema } from './short-date.schema';
import { TVEpisode } from './tv-episode.schema';

//export type TVShowDocument = TVShow & Document;

@Schema({ _id: false })
export class TVShow {
  @Prop({ default: 0 })
  episodeCount: number;

  @Prop({ type: () => BigInt, ref: 'TVEpisode' })
  lastEpisode: TVEpisode;

  @Prop({ type: () => BigInt, ref: 'TVEpisode' })
  pLastEpisode: TVEpisode;

  @Prop({ type: ShortDateSchema })
  lastAirDate: ShortDate;

  @Prop({ type: [{ type: MongooseSchema.Types.Mixed, ref: 'TVEpisode' }] })
  episodes: Types.Array<TVEpisode>;
}

export const TVShowSchema = SchemaFactory.createForClass(TVShow);
