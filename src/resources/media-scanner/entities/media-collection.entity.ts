import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaTranslation } from './media-translation.entity';

export class MediaCollection {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  overview: string;

  @Exclude()
  posterPath: string;

  @Exclude()
  backdropPath: string;

  @ApiProperty({
    type: [MediaTranslation]
  })
  translations: MediaTranslation[];

  @ApiProperty()
  @Expose()
  get posterUrl(): string {
    if (this.posterPath?.startsWith('/'))
      return `https://image.tmdb.org/t/p/original${this.posterPath}`;
    return this.posterPath;
  }

  @ApiProperty()
  @Expose()
  get backdropUrl(): string {
    if (this.backdropPath?.startsWith('/'))
      return `https://image.tmdb.org/t/p/original${this.backdropPath}`;
    return this.backdropPath;
  }
}
