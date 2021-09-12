import { MediaEpisode } from './media-episode.entity';

export class MediaSeason {

  airDate: string;

  seasonNumber: number;

  episodeCount: number;

  name: string;

  overview: string;

  posterPath: string;

  visibility: number;

  episodes: MediaEpisode[];
}