import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';
import { User } from '../../users/entities/user.entity';

export class History {
  @ApiProperty()
  _id: string;

  @Exclude()
  user: User;

  @ApiProperty({
    type: Media
  })
  @Type(() => Media)
  media: Media;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  __v: number;
}
