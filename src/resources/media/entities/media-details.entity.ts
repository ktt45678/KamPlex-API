import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { User } from '../../users/entities/user.entity';
import { Media } from './media.entity';
import { Credit } from './credit.entity';
import { Movie } from './movie.entity';
import { TVShow } from './tv-show.entity';
import { MediaVideo } from './media-video.entity';
import { Production } from '../../productions/entities/production.entity';
import { MediaExternalIds } from './media-external-ids.entity';

export class MediaDetails extends Media {
  @ApiProperty({
    type: Production
  })
  @Type(() => Production)
  productions: Production[];

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
    type: User
  })
  @Type(() => User)
  addedBy: User;
}