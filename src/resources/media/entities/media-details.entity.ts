import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { User } from '../../users/entities/user.entity';
import { Media } from './media.entity';
import { Credit } from './credit.entity';
import { Movie } from './movie.entity';
import { TVShow } from './tv-show.entity';
import { MediaVideo } from './media-video.entity';
import { Producer } from '../../producers/entities/producer.entity';

export class MediaDetails extends Media {
  @ApiProperty({
    type: Producer
  })
  @Type(() => Producer)
  producers: Producer[];

  @Exclude({ toPlainOnly: true })
  credits: Credit[];

  @ApiProperty()
  runtime: number;

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

  @ApiProperty()
  status: number;

  @ApiProperty()
  visibility: number;

  @ApiProperty({
    type: User
  })
  @Type(() => User)
  addedBy: User;
}