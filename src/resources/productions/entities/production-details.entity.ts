import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Media } from '../../media/entities/media.entity';
import { Production } from './production.entity';

export class ProductionDetails extends Production {
  @Exclude()
  media: Media;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
