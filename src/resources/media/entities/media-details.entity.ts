import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { User } from '../../users/entities';
import { Tag } from '../../tags/entities';
import { Media } from './media.entity';
import { Credit } from './credit.entity';
import { Movie } from './movie.entity';
import { TVShow } from './tv-show.entity';
import { MediaVideo } from './media-video.entity';
import { Production } from '../../productions/entities/production.entity';
import { MediaExternalIds } from './media-external-ids.entity';
import { MediaScannerData } from './media-scanner-data.entiry';

export class MediaDetails extends Media {
  @ApiProperty({
    type: Production
  })
  @Type(() => Production)
  studios: Production[];

  @ApiProperty({
    type: Production
  })
  @Type(() => Production)
  producers: Production[];

  @ApiProperty({
    type: Tag
  })
  @Type(() => Tag)
  tags: Tag[];

  @Exclude({ toPlainOnly: true })
  credits: Credit[];

  @ApiProperty({
    type: Movie
  })
  @Type(() => Movie)
  movie: Movie;

  @ApiProperty({
    type: TVShow
  })
  @Type(() => TVShow)
  tv: TVShow;

  @ApiProperty({
    type: MediaVideo
  })
  @Type(() => MediaVideo)
  videos: MediaVideo[];

  @ApiProperty({
    type: MediaExternalIds
  })
  @Type(() => MediaExternalIds)
  externalIds: MediaExternalIds;

  @ApiProperty({
    type: MediaScannerData
  })
  @Type(() => MediaScannerData)
  scanner: MediaScannerData;

  @ApiProperty({
    type: User
  })
  @Type(() => User)
  addedBy: User;
}
