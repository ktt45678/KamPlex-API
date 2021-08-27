import { TvSeason } from './tv-season.entity';

export class MediaTv {

  episodeRuntime: number[];

  firstAirDate: string;

  lastAirDate: string;

  seasonCount: number;

  seasons: TvSeason[];
}