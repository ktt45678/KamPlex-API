import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class TVSeason {
  @ApiProperty()
  airDate: string;

  @ApiProperty()
  seasonNumber: number;

  @ApiProperty()
  episodeCount: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  posterPath: string;

  @Expose()
  get posterUrl(): string {
    if (this.posterPath?.startsWith('/'))
      return `https://image.tmdb.org/t/p/original${this.posterPath}`;
    return this.posterPath;
  }
}
