import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { Media } from './media.entity';
import { MediaCollection } from './media-collection.entity';
import { MediaExternalIds } from './media-external-ids.entity';
import { Production } from './production.entity';
import { MediaVideo } from './media-video.entity';
import { MediaAltTitle } from './media-alt-title.entity';
import { MediaTranslation } from './media-translation.entity';
import { TVSeason } from './tv-season.entity';

export class MediaDetails extends Media {
  @ApiProperty({
    type: [MediaAltTitle]
  })
  altTitles: MediaAltTitle[];

  @ApiProperty()
  originalLanguage: string;

  @ApiProperty({
    type: MediaCollection
  })
  @Expose({ groups: ['movie'] })
  collection: MediaCollection;

  @ApiProperty()
  genres: string[];

  @ApiProperty({
    type: [Production]
  })
  productions: Production[];

  @ApiProperty({
    type: [MediaVideo]
  })
  videos: MediaVideo[];

  @Exclude()
  backdropPath: string;

  @ApiProperty()
  runtime: number;

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

  @ApiProperty({
    type: [TVSeason]
  })
  @Expose({ groups: ['tv'] })
  seasons: TVSeason[];

  @ApiProperty()
  status: string;

  @ApiProperty({
    type: MediaExternalIds
  })
  externalIds: MediaExternalIds;

  @ApiProperty({
    type: [MediaTranslation]
  })
  translations: MediaTranslation[];

  @ApiProperty()
  @Expose()
  get backdropUrl(): string {
    return `https://www.themoviedb.org/t/p/original${this.backdropPath}`;
  }
}
