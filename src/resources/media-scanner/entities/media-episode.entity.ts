import { MediaSource } from './media-source.entity';

export class MediaEpisode {

  airDate: string;

  episodeNumber: number;

  runtime: number;

  name: string;

  overview: string;

  stillPath: string;

  visibility: number;

  source: MediaSource
}