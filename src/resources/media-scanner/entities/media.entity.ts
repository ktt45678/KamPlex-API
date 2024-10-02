import { Exclude, Expose } from 'class-transformer';

export class Media {

  id: number;

  title: string;

  originalTitle: string;

  overview: string;

  @Exclude()
  posterPath: string;

  releaseDate: string;

  adult: boolean;

  @Expose()
  get posterUrl(): string {
    if (this.posterPath?.startsWith('/'))
      return `https://image.tmdb.org/t/p/original${this.posterPath}`;
    return this.posterPath;
  }
}
