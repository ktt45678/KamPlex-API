import { ApiProperty } from '@nestjs/swagger';

import { User } from '../../users/entities/user.entity';
import { Media } from './media.entity';
import { Credit } from './credit.entity';
import { Movie } from './movie.entity';
import { TVShow } from './tv-show.entity';
import { MediaExternalIds } from './media-external-ids.entity';
import { MediaVideo } from './media-video.entity';
import { Producer } from '../../producers/entities/producer.entity';
import { Type } from 'class-transformer';

export class MediaDetails extends Media {
  @ApiProperty()
  @Type(() => Producer)
  producers: Producer[];

  @ApiProperty()
  @Type(() => Credit)
  credits: Credit[];

  @ApiProperty()
  runtime: number;

  @ApiProperty()
  @Type(() => Movie)
  movie: Movie;

  @ApiProperty()
  @Type(() => TVShow)
  tv: TVShow;

  @ApiProperty()
  @Type(() => MediaVideo)
  videos: MediaVideo[];

  @ApiProperty()
  submitted: boolean;

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  visibility: number;

  @ApiProperty()
  @Type(() => User)
  addedBy: User;
}