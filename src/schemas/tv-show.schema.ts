import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { TVEpisode } from './tv-episode.schema';

export type TVShowDocument = TVShow & Document;

@Schema({ _id: false })
export class TVShow {
  @Prop({ required: true, default: 0 })
  views: number;

  @Prop([TVEpisode])
  episodes: Types.Array<TVEpisode>;
}

export const TVShowSchema = SchemaFactory.createForClass(TVShow);
