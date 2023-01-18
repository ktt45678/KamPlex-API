import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { MediaImageItem } from './media-image-item.entity';

export class MediaImages {
  @ApiProperty()
  @Type(() => MediaImageItem)
  backdrops: MediaImageItem[];

  @ApiProperty()
  @Type(() => MediaImageItem)
  posters: MediaImageItem[];
}
