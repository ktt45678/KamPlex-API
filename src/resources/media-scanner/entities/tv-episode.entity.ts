import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class TVEpisode {
  @ApiProperty()
  airDate: string;

  @ApiProperty()
  episodeNumber: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  @Exclude({ toPlainOnly: true })
  stillPath: string;

  @Expose()
  get stillUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.stillPath}`;
  }
}
