import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Genre } from './genre.entity';
import { Media } from '../../media/entities/media.entity';

export class GenreDetails extends Genre {
  @Exclude()
  media: Media[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
