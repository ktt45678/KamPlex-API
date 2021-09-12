import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';
import { Producer } from './producer.entity';

export class ProducerDetails extends Producer {
  @ApiProperty()
  country: string;

  @ApiProperty()
  logoUrl: string;

  @Exclude()
  media: Media;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
