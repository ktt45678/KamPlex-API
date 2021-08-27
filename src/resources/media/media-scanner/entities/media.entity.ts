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
    return `https://www.themoviedb.org/t/p/original${this.posterPath}`;
  }
}
