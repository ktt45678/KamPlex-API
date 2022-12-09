import { Expose } from 'class-transformer';

export class MediaEpisode {
  id: number;

  airDate: string;

  episodeNumber: number;

  name: string;

  overview: string;

  stillPath: string;

  @Expose()
  get stillUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.stillPath}`;
  }
}