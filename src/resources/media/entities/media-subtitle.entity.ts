import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { MediaStorage } from './media-storage.entity';

export class MediaSubtitle {
  @ApiProperty()
  language: string;

  @Exclude({ toPlainOnly: true })
  storage: MediaStorage;
}