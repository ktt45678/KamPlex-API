import { SeasonEpisode } from './season-episode.entity';

export class TvSeason {

  airDate: string;

  seasonNumber: number;

  episodeCount: number;

  name: string;

  overview: string;

  posterPath: string;

  visibility: number;

  episodes: SeasonEpisode[];
}