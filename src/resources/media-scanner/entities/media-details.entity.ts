import { Exclude, Expose } from 'class-transformer';

import { Media } from './media.entity';
import { MediaExternalIds } from './media-external-ids.entity';
import { ApiProperty } from '@nestjs/swagger';

export class MediaDetails extends Media {
  @ApiProperty()
  genres: string[];

  @Exclude()
  backdropPath: string;

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  episodeRuntime: number[];

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  firstAirDate: string;

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  lastAirDate: string;

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  totalSeasons: number;

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  totalEpisodes: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  externalIds: MediaExternalIds;

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