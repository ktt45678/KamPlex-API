import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class MediaCollection {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @Exclude()
  posterPath: string;

  @Exclude()
  backdropPath: string;

  @ApiProperty()
  @Expose()
  get posterUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.posterPath}`;
  }

  @ApiProperty()
  @Expose()
  get backdropUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.backdropPath}`;
  }
}
