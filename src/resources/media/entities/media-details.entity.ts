import { Exclude, Expose } from 'class-transformer';

import { User } from '../../users/entities/user.entity';
import { Media } from './media.entity';
import { MediaCredit } from './media-credit.entity';
import { MediaExternalIds } from './media-external-ids.entity';
import { MediaGenre } from './media-genre.entiry';
import { MediaSource } from './media-source.entity';
import { TvSeason } from './tv-season.entity';
import { MediaVideo } from './media-video.entity';
import { ApiProperty } from '@nestjs/swagger';

export class MediaDetails extends Media {
  @ApiProperty()
  genres: MediaGenre[];

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
  seasons: TvSeason[];

  @ApiProperty()
  videos: MediaVideo[];

  @ApiProperty()
  credits: MediaCredit[];

  @ApiProperty()
  @Expose({ groups: ['movie'] })
  source: MediaSource;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  contributors: User[];

  @ApiProperty()
  externalIds: MediaExternalIds;

  @ApiProperty()
  @Expose()
  get posterUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.backdropPath}`;
  }

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  get seasonCount(): number {
    return this.seasons.length;
  }

  @ApiProperty()
  @Expose({ groups: ['tv'] })
  get episodeCount(): number {
    return this.seasons.length;
  }
}