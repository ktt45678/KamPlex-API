import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { Media } from '../../media';
import { Collection } from './collection.entity';

export class CollectionDetails extends Collection {
  @ApiProperty()
  overview: string;

  @ApiProperty({ type: Media })
  @Type(() => Media)
  media: Media;
}
