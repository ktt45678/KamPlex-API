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
    return `https://www.themoviedb.org/t/p/original${this.posterPath}`;
  }

  @ApiProperty()
  @Expose()
  get backdropUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.backdropPath}`;
  }
}
