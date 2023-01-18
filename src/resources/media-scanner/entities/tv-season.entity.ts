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
    return `https://www.themoviedb.org/t/p/original${this.posterPath}`;
  }
}
